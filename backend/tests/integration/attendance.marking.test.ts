import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { AttendanceModel } from '../../src/models/attendance.model'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import {
  bearer as adminBearer,
  createLiveClassFixture,
  createScheduledBatchFixture,
} from '../helpers/live-class-fixtures'
import {
  bearer as studentBearer,
  createEnrollment,
  createLoggedInStudent,
} from '../helpers/student-portal-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function setupSessionWithRoster() {
  const admin = await loginAs({
    email: `attendance-admin-${String(Date.now())}@example.com`,
    role: 'ADMIN',
  })
  const course = await createPublishedCourseFixture()
  const batch = await createScheduledBatchFixture(course._id.toString())

  const studentA = await createLoggedInStudent()
  await createEnrollment(studentA.studentId, course._id.toString(), batch._id.toString(), {
    status: 'ACTIVE',
  })
  const studentB = await createLoggedInStudent()
  await createEnrollment(studentB.studentId, course._id.toString(), batch._id.toString(), {
    status: 'ACTIVE',
  })
  const studentC = await createLoggedInStudent()
  await createEnrollment(studentC.studentId, course._id.toString(), batch._id.toString(), {
    status: 'WAITLISTED',
  })

  const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
    status: 'SCHEDULED',
  })

  return { admin, course, batch, studentA, studentB, studentC, session }
}

describe('Attendance — roster, bulk marking, finalization, reporting', () => {
  it('the roster contains only eligible (ACTIVE/CONFIRMED) enrollments, all UNMARKED before any marking', async () => {
    const { admin, session, studentA, studentB, studentC } = await setupSessionWithRoster()

    const res = await request(app)
      .get(`/api/v1/live-classes/${session._id.toString()}/attendance`)
      .set(adminBearer(admin))

    expect(res.status).toBe(200)
    const rosterStudentIds = (res.body.data.roster as { studentId: string }[]).map(
      (row) => row.studentId,
    )
    expect(rosterStudentIds).toContain(studentA.studentId)
    expect(rosterStudentIds).toContain(studentB.studentId)
    expect(rosterStudentIds).not.toContain(studentC.studentId) // WAITLISTED — never eligible
    expect(
      (res.body.data.roster as { status: string }[]).every((row) => row.status === 'UNMARKED'),
    ).toBe(true)
  })

  it('bulk-marks valid students and rejects a student outside the eligible roster', async () => {
    const { admin, session, studentA, studentB, studentC } = await setupSessionWithRoster()

    const res = await request(app)
      .patch(`/api/v1/live-classes/${session._id.toString()}/attendance`)
      .set(adminBearer(admin))
      .send({
        records: [
          { studentId: studentA.studentId, status: 'PRESENT' },
          { studentId: studentB.studentId, status: 'LATE' },
          { studentId: studentC.studentId, status: 'PRESENT' },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.rejected).toEqual([
      { studentId: studentC.studentId, reason: 'Not an eligible student for this session' },
    ])
    const roster = res.body.data.roster.roster as { studentId: string; status: string }[]
    expect(roster.find((row) => row.studentId === studentA.studentId)?.status).toBe('PRESENT')
    expect(roster.find((row) => row.studentId === studentB.studentId)?.status).toBe('LATE')
  })

  it('finalizing marks any still-unmarked eligible student ABSENT, blocks further edits, and reopening restores them', async () => {
    const { admin, session, studentA, studentB } = await setupSessionWithRoster()
    const sessionId = session._id.toString()

    await request(app)
      .patch(`/api/v1/live-classes/${sessionId}/attendance`)
      .set(adminBearer(admin))
      .send({ records: [{ studentId: studentA.studentId, status: 'PRESENT' }] })

    const finalized = await request(app)
      .post(`/api/v1/live-classes/${sessionId}/attendance/finalize`)
      .set(adminBearer(admin))
    expect(finalized.status).toBe(200)
    expect(finalized.body.data.attendanceStatus).toBe('FINALIZED')
    const roster = finalized.body.data.roster as { studentId: string; status: string }[]
    expect(roster.find((row) => row.studentId === studentA.studentId)?.status).toBe('PRESENT')
    expect(roster.find((row) => row.studentId === studentB.studentId)?.status).toBe('ABSENT')

    const blockedEdit = await request(app)
      .patch(`/api/v1/live-classes/${sessionId}/attendance`)
      .set(adminBearer(admin))
      .send({ records: [{ studentId: studentB.studentId, status: 'PRESENT' }] })
    expect(blockedEdit.status).toBe(409)

    const reopened = await request(app)
      .post(`/api/v1/live-classes/${sessionId}/attendance/reopen`)
      .set(adminBearer(admin))
      .send({ reason: 'Trainer reported a manual correction' })
    expect(reopened.status).toBe(200)
    expect(reopened.body.data.attendanceStatus).toBe('OPEN')

    const editAfterReopen = await request(app)
      .patch(`/api/v1/live-classes/${sessionId}/attendance`)
      .set(adminBearer(admin))
      .send({ records: [{ studentId: studentB.studentId, status: 'PRESENT' }] })
    expect(editAfterReopen.status).toBe(200)
  })

  it('computes attendance percentage as (present + late) / (finalized sessions - excused)', async () => {
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    const student = await createLoggedInStudent()
    const enrollment = await createEnrollment(
      student.studentId,
      course._id.toString(),
      batch._id.toString(),
      {
        status: 'ACTIVE',
      },
    )

    // Sessions are created already FINALIZED, and attendance records are
    // written directly via the model (bypassing the bulk-mark API, which
    // refuses to touch a FINALIZED session by design — see the "finalizing
    // ... blocks further edits" test above for that rule) — this test's
    // only concern is the percentage formula itself.
    const statuses: { status: 'PRESENT' | 'ABSENT' | 'EXCUSED' }[] = [
      { status: 'PRESENT' },
      { status: 'ABSENT' },
      { status: 'EXCUSED' },
    ]
    for (const { status } of statuses) {
      const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
        status: 'COMPLETED',
        attendanceStatus: 'FINALIZED',
      })
      await AttendanceModel.create({
        sessionId: session._id,
        batchId: batch._id,
        courseId: course._id,
        studentId: student.studentId,
        enrollmentId: enrollment._id,
        status,
        source: 'MANUAL',
      })
    }

    const res = await request(app).get('/api/v1/student/attendance').set(studentBearer(student))

    expect(res.status).toBe(200)
    const courseSummary = res.body.data.courses.find(
      (row: { courseId: string }) => row.courseId === course._id.toString(),
    )
    expect(courseSummary.summary.totalFinalizedSessions).toBe(3)
    expect(courseSummary.summary.attendancePercentage).toBe(50) // 1 present / (3 - 1 excused) = 50%
  })

  it('exports the attendance report as CSV with the expected header row', async () => {
    const { admin, session, studentA } = await setupSessionWithRoster()
    await request(app)
      .patch(`/api/v1/live-classes/${session._id.toString()}/attendance`)
      .set(adminBearer(admin))
      .send({ records: [{ studentId: studentA.studentId, status: 'PRESENT' }] })

    const res = await request(app).get('/api/v1/attendance/export').set(adminBearer(admin))

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text.split('\r\n')[0]).toBe(
      'Session Code,Date,Course,Batch,Student ID,Student Name,Status',
    )
  })

  it('forbids marking attendance with only attendance:read (no :manage) permission', async () => {
    // Deliberately builds fixtures directly rather than via `setupSessionWithRoster()`
    // (which calls `loginAs({ role: 'ADMIN' })` internally) — a second `loginAs` for
    // the same role name in one test would violate the unique index on `roles.name`.
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    const student = await createLoggedInStudent()
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'SCHEDULED',
    })
    const readOnly = await loginAs({
      email: `attendance-readonly-${String(Date.now())}@example.com`,
      role: 'ADMIN',
      permissions: ['attendance:read', 'live_classes:read'],
    })

    const res = await request(app)
      .patch(`/api/v1/live-classes/${session._id.toString()}/attendance`)
      .set(adminBearer(readOnly))
      .send({ records: [{ studentId: student.studentId, status: 'PRESENT' }] })

    expect(res.status).toBe(403)
  })
})
