import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import {
  createActiveTrainerFixture,
  createDraftCourseFixture,
  createPublishedCourseFixture,
  validCreateBatchPayload,
} from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('POST /api/v1/batches', () => {
  it('creates a DRAFT batch with a generated DM-BAT-{YEAR}-{6digit} code', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.batchCode).toMatch(/^DM-BAT-\d{4}-\d{6}$/)
    expect(res.body.data.courseId).toBe(course._id.toString())
  })

  it('generates unique batch codes under concurrent creation', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/batches')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send(validCreateBatchPayload(course._id.toString())),
      ),
    )

    const codes = responses.map((res) => res.body.data.batchCode as string)
    expect(new Set(codes).size).toBe(5)
  })

  it('rejects a nonexistent courseId', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload('000000000000000000000000'))

    expect(res.status).toBe(400)
  })

  it('rejects a nonexistent primary trainer id', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          primaryTrainerId: '000000000000000000000000',
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects a nonexistent assistant trainer id', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          assistantTrainerIds: ['000000000000000000000000'],
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects duplicate assistant trainer ids', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          assistantTrainerIds: [trainer._id.toString(), trainer._id.toString()],
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects a primary trainer also listed as an assistant', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          primaryTrainerId: trainer._id.toString(),
          assistantTrainerIds: [trainer._id.toString()],
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects mass-assignment of status/batchCode/audit fields', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        ...validCreateBatchPayload(course._id.toString()),
        status: 'ACTIVE',
        batchCode: 'DM-BAT-2020-000001',
        createdBy: '000000000000000000000000',
      })

    expect(res.status).toBe(400)
  })

  it('rejects endDate <= startDate', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          startDate: new Date('2026-09-10'),
          endDate: new Date('2026-09-01'),
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects minimumStudents > maxStudents', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          maxStudents: 10,
          minimumStudents: 20,
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects an invalid timezone string', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString(), { timezone: 'Not/A_Timezone' }))

    expect(res.status).toBe(400)
  })

  it('rejects maxStudents <= 0', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString(), { maxStudents: 0 }))

    expect(res.status).toBe(400)
  })

  it('accepts a batch created against a DRAFT course', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    const course = await createDraftCourseFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('accepts any existing trainer as primary at creation time, even outside the course eligible-trainers list', async () => {
    // Creation only validates trainer existence (`assertTrainersExist`) — eligibility
    // (`TRAINER_NOT_ELIGIBLE`) is a scheduling-readiness concern, not a create-time
    // rejection. See batch.readiness-conflicts.test.ts for the eligibility blocker itself.
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })
    const otherTrainer = await createActiveTrainerFixture()
    const course = await createPublishedCourseFixture({
      eligibleTrainerIds: [otherTrainer._id.toString()],
    })
    const ineligibleTrainer = await createActiveTrainerFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          primaryTrainerId: ineligibleTrainer._id.toString(),
        }),
      )

    expect(res.status).toBe(201)
  })

  it('accepts any existing trainer when the course has no eligible-trainers restriction', async () => {
    const admin = await loginAs({ email: 'admin15@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()

    const res = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          primaryTrainerId: trainer._id.toString(),
        }),
      )

    expect(res.status).toBe(201)
  })
})
