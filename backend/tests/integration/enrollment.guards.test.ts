import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { hasLearningAccess } from '../../src/services/enrollment-access.service'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

setupTransactionalTestDatabase()

describe('hasLearningAccess (pure entitlement rule)', () => {
  it('grants access for ACTIVE', () => {
    expect(hasLearningAccess({ status: 'ACTIVE', accessStartsAt: null, accessEndsAt: null })).toBe(
      true,
    )
  })

  it('denies access for SUSPENDED regardless of dates', () => {
    expect(
      hasLearningAccess({
        status: 'SUSPENDED',
        accessStartsAt: new Date('2020-01-01'),
        accessEndsAt: null,
      }),
    ).toBe(false)
  })

  it('denies access for WAITLISTED/PENDING/CANCELLED/DROPPED', () => {
    for (const status of ['WAITLISTED', 'PENDING', 'CANCELLED', 'DROPPED'] as const) {
      expect(hasLearningAccess({ status, accessStartsAt: null, accessEndsAt: null })).toBe(false)
    }
  })

  it('grants COMPLETED access when accessEndsAt is null (lifetime access) or still in the future, denies once past', () => {
    const now = new Date('2026-06-01')
    expect(
      hasLearningAccess({ status: 'COMPLETED', accessStartsAt: null, accessEndsAt: null }, now),
    ).toBe(true)
    expect(
      hasLearningAccess(
        { status: 'COMPLETED', accessStartsAt: null, accessEndsAt: new Date('2026-12-01') },
        now,
      ),
    ).toBe(true)
    expect(
      hasLearningAccess(
        { status: 'COMPLETED', accessStartsAt: null, accessEndsAt: new Date('2026-01-01') },
        now,
      ),
    ).toBe(false)
  })
})

describe('Delete-protection guards', () => {
  it('DELETE /batches/:id is rejected while the batch has a non-terminal enrollment', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    const res = await request(app)
      .delete(`/api/v1/batches/${String(batch._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })

  it('student soft-delete is rejected while the student has a non-terminal enrollment', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    const res = await request(app)
      .delete(`/api/v1/students/${String(student._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })

  it('course soft-delete is rejected while a non-archived batch of that course exists', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    await createBatchFixture(course._id.toString())

    const res = await request(app)
      .delete(`/api/v1/courses/${String(course._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})

describe('POST /api/v1/enrollments/bulk/enroll', () => {
  it('enrolls each student independently, reporting confirmed vs. waitlisted vs. failed per item', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments/bulk/enroll')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        batchId: batch._id.toString(),
        studentIds: [first._id.toString(), second._id.toString()],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toHaveLength(1)
    expect(res.body.data.waitlisted).toHaveLength(1)
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('rejects a bulk request exceeding the max batch size', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 200 })
    const ids = Array.from({ length: 101 }, () => '000000000000000000000000')

    const res = await request(app)
      .post('/api/v1/enrollments/bulk/enroll')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ batchId: batch._id.toString(), studentIds: ids })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/enrollments', () => {
  it('lists enrollments with joined student/batch/course display fields and pagination meta', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    const res = await request(app)
      .get('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(1)
    expect(res.body.data[0].student).not.toBeNull()
    expect(res.body.data[0].batch).not.toBeNull()
    expect(res.body.data[0].course).not.toBeNull()
  })

  it('denies a STUDENT (no admin enrollment read access)', async () => {
    const student = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })
    const res = await request(app)
      .get('/api/v1/enrollments')
      .set('Authorization', `Bearer ${student.accessToken}`)
    expect(res.status).toBe(403)
  })

  /**
   * Regression test: aggregation `$match` stages never auto-cast query
   * values against the schema the way `find()`/`findOne()` do — a plain
   * string `studentId`/`batchId`/`courseId` filter silently matched zero
   * rows until `enrollment.repository.ts#buildPreLookupMatch` explicitly
   * wraps each in `new Types.ObjectId(...)`. Caught by this test, not
   * `list()`'s own unfiltered happy path above.
   */
  it('filters by studentId/batchId/courseId (ObjectId-typed query params, not just string equality)', async () => {
    const admin = await loginAs({ email: 'admin_filter@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batchA = await createBatchFixture(course._id.toString())
    const batchB = await createBatchFixture(course._id.toString())
    const studentA = await createStudentFixture()
    const studentB = await createStudentFixture()

    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: studentA._id.toString(), batchId: batchA._id.toString() })
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: studentB._id.toString(), batchId: batchB._id.toString() })

    const byStudent = await request(app)
      .get(`/api/v1/enrollments?studentId=${String(studentA._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byStudent.body.meta.total).toBe(1)
    expect(byStudent.body.data[0].student.id).toBe(studentA._id.toString())

    const byBatch = await request(app)
      .get(`/api/v1/enrollments?batchId=${String(batchB._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byBatch.body.meta.total).toBe(1)
    expect(byBatch.body.data[0].batch.id).toBe(batchB._id.toString())

    const byCourse = await request(app)
      .get(`/api/v1/enrollments?courseId=${String(course._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byCourse.body.meta.total).toBe(2)
  })
})

describe('GET /api/v1/enrollments/export', () => {
  it('exports a CSV without leaking internalNotes', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        studentId: student._id.toString(),
        batchId: batch._id.toString(),
        internalNotes: 'secret internal note',
      })

    const res = await request(app)
      .get('/api/v1/enrollments/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).not.toContain('secret internal note')
  })
})
