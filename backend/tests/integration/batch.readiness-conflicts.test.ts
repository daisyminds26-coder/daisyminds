import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { CourseModel } from '../../src/models/course.model'
import { loginAs } from '../helpers/auth'
import {
  createActiveTrainerFixture,
  createDraftCourseFixture,
  createPublishedCourseFixture,
  readyToScheduleBatchPayload,
  validCreateBatchPayload,
} from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function createBatch(
  accessToken: string,
  courseId: string,
  overrides: Parameters<typeof validCreateBatchPayload>[1] = {},
) {
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateBatchPayload(courseId, overrides))
  return res.body.data.id as string
}

async function readiness(accessToken: string, id: string) {
  const res = await request(app)
    .post(`/api/v1/batches/${id}/readiness-check`)
    .set('Authorization', `Bearer ${accessToken}`)
  return res.body.data as { ready: boolean; blockers: { code: string }[] }
}

describe('POST /api/v1/batches/:id/readiness-check', () => {
  it('reports multiple blockers for an empty/bare batch', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const id = await createBatch(admin.accessToken, course._id.toString())

    const result = await readiness(admin.accessToken, id)

    expect(result.ready).toBe(false)
    expect(result.blockers.length).toBeGreaterThan(1)
  })

  it('reports ready for a fully-configured batch (published course + active/eligible trainer + a schedule spanning >= 7 days)', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  it('blocks an OFFLINE batch missing a venue address (LOCATION_INCOMPLETE)', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString(), {
          deliveryMode: 'OFFLINE',
        }),
      )

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('LOCATION_INCOMPLETE')
  })

  it('blocks a batch linked to a DRAFT course (COURSE_NOT_PUBLISHED)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createDraftCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('COURSE_NOT_PUBLISHED')
  })

  it('blocks a batch linked to an ARCHIVED course (COURSE_ARCHIVED)', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    // Archive the course directly (bypassing course-management's own publish
    // prerequisites — batch-readiness only cares about the resulting status).
    await CourseModel.findByIdAndUpdate(course._id, { status: 'ARCHIVED' })

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('COURSE_ARCHIVED')
  })

  it('blocks a batch whose primary trainer is TERMINATED (TRAINER_NOT_ACTIVE)', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture({ employmentStatus: 'TERMINATED' })
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('TRAINER_NOT_ACTIVE')
  })

  it("blocks a batch whose primary trainer's linked user account is not ACTIVE (TRAINER_ACCOUNT_NOT_ACTIVE)", async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture({ userStatus: 'SUSPENDED' })
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('TRAINER_ACCOUNT_NOT_ACTIVE')
  })

  it('blocks a primary trainer not in the course non-empty eligibleTrainerIds (TRAINER_NOT_ELIGIBLE)', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const eligibleTrainer = await createActiveTrainerFixture()
    const course = await createPublishedCourseFixture({
      eligibleTrainerIds: [eligibleTrainer._id.toString()],
    })
    const ineligibleTrainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), ineligibleTrainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('TRAINER_NOT_ELIGIBLE')
  })

  it('does not block on eligibility when the course has no eligible-trainers restriction', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const result = await readiness(admin.accessToken, created.body.data.id as string)

    expect(result.blockers.map((b) => b.code)).not.toContain('TRAINER_NOT_ELIGIBLE')
    expect(result.ready).toBe(true)
  })
})

describe('GET /api/v1/batches/:id/conflicts', () => {
  it('reports an AVAILABILITY conflict when the weekly slot overlaps a BLOCKED availability window (same timezone)', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture({
      availability: [
        {
          dayOfWeek: 'MONDAY',
          startTime: '18:00',
          endTime: '20:00',
          timeZone: 'Asia/Kolkata',
          type: 'BLOCKED',
        },
      ],
    })
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const res = await request(app)
      .get(`/api/v1/batches/${String(created.body.data.id)}/conflicts`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'AVAILABILITY' })]),
    )
  })

  it('reports a CROSS_BATCH conflict when the trainer is already SCHEDULED on another batch with an overlapping range and slot', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()

    const firstBatch = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))
    const scheduleRes = await request(app)
      .post(`/api/v1/batches/${String(firstBatch.body.data.id)}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(scheduleRes.status).toBe(200)

    const secondBatch = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))

    const res = await request(app)
      .get(`/api/v1/batches/${String(secondBatch.body.data.id)}/conflicts`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CROSS_BATCH',
          conflictingBatchId: String(firstBatch.body.data.id),
        }),
      ]),
    )
  })

  it('reports no conflicts when schedules and availability do not overlap', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()

    const firstBatch = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))
    await request(app)
      .post(`/api/v1/batches/${String(firstBatch.body.data.id)}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const secondBatch = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString(), {
          weeklySchedule: [{ dayOfWeek: 'TUESDAY', startTime: '18:00', endTime: '20:00' }],
        }),
      )

    const res = await request(app)
      .get(`/api/v1/batches/${String(secondBatch.body.data.id)}/conflicts`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})
