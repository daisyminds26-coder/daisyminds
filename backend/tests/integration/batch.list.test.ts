import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import {
  createActiveTrainerFixture,
  createPublishedCourseFixture,
  validCreateBatchPayload,
} from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

const DAY_MS = 24 * 60 * 60 * 1000

async function seedBatches(accessToken: string) {
  const courseA = await createPublishedCourseFixture()
  const courseB = await createPublishedCourseFixture()
  const trainer = await createActiveTrainerFixture()

  const first = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(
      validCreateBatchPayload(courseA._id.toString(), {
        name: 'August 2026 Morning Batch',
        deliveryMode: 'ONLINE',
        timezone: 'Asia/Kolkata',
        primaryTrainerId: trainer._id.toString(),
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-09-01'),
        maxStudents: 20,
      }),
    )
  const second = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(
      validCreateBatchPayload(courseB._id.toString(), {
        name: 'December 2026 Evening Batch',
        deliveryMode: 'OFFLINE',
        timezone: 'America/New_York',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2027-01-01'),
        maxStudents: 50,
        waitlistEnabled: true,
      }),
    )

  return { courseA, courseB, trainer, first, second }
}

describe('GET /api/v1/batches', () => {
  it('lists batches with pagination meta', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    await seedBatches(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/batches?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta.total).toBe(2)
    expect(res.body.meta.totalPages).toBe(2)
  })

  it('searches by batchCode', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const { first } = await seedBatches(admin.accessToken)

    const res = await request(app)
      .get(`/api/v1/batches?search=${String(first.body.data.batchCode)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].batchCode).toBe(first.body.data.batchCode)
  })

  it('searches by name', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    await seedBatches(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/batches?search=December')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('December 2026 Evening Batch')
  })

  it('filters by status, courseId, primaryTrainerId, deliveryMode, timezone, and waitlistEnabled', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const { courseA, trainer } = await seedBatches(admin.accessToken)

    const byStatus = await request(app)
      .get('/api/v1/batches?status=DRAFT')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byStatus.body.data).toHaveLength(2)

    const byCourse = await request(app)
      .get(`/api/v1/batches?courseId=${courseA._id.toString()}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byCourse.body.data).toHaveLength(1)
    expect(byCourse.body.data[0].courseId).toBe(courseA._id.toString())

    const byTrainer = await request(app)
      .get(`/api/v1/batches?primaryTrainerId=${trainer._id.toString()}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byTrainer.body.data).toHaveLength(1)
    expect(byTrainer.body.data[0].primaryTrainerId).toBe(trainer._id.toString())

    const byDeliveryMode = await request(app)
      .get('/api/v1/batches?deliveryMode=OFFLINE')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byDeliveryMode.body.data).toHaveLength(1)
    expect(byDeliveryMode.body.data[0].deliveryMode).toBe('OFFLINE')

    const byTimezone = await request(app)
      .get('/api/v1/batches?timezone=America%2FNew_York')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byTimezone.body.data).toHaveLength(1)
    expect(byTimezone.body.data[0].timezone).toBe('America/New_York')

    const byWaitlist = await request(app)
      .get('/api/v1/batches?waitlistEnabled=true')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byWaitlist.body.data).toHaveLength(1)
    expect(byWaitlist.body.data[0].waitlistEnabled).toBe(true)
  })

  it('filters by start/end date range and capacity range', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    await seedBatches(admin.accessToken)

    const byDateRange = await request(app)
      .get('/api/v1/batches?startDateFrom=2026-11-01&startDateTo=2026-12-31')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byDateRange.body.data).toHaveLength(1)
    expect(byDateRange.body.data[0].name).toBe('December 2026 Evening Batch')

    const byCapacity = await request(app)
      .get('/api/v1/batches?minCapacity=40&maxCapacity=60')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(byCapacity.body.data).toHaveLength(1)
    expect(byCapacity.body.data[0].maxStudents).toBe(50)
  })

  it('filters by temporal=upcoming/current/past', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const now = Date.now()

    await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          name: 'Past Temporal Batch',
          startDate: new Date(now - 30 * DAY_MS),
          endDate: new Date(now - 10 * DAY_MS),
        }),
      )
    await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          name: 'Current Temporal Batch',
          startDate: new Date(now - 5 * DAY_MS),
          endDate: new Date(now + 5 * DAY_MS),
        }),
      )
    await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          name: 'Upcoming Temporal Batch',
          startDate: new Date(now + 10 * DAY_MS),
          endDate: new Date(now + 30 * DAY_MS),
        }),
      )

    const upcoming = await request(app)
      .get('/api/v1/batches?temporal=upcoming')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(upcoming.body.data).toHaveLength(1)
    expect(upcoming.body.data[0].name).toBe('Upcoming Temporal Batch')

    const past = await request(app)
      .get('/api/v1/batches?temporal=past')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(past.body.data).toHaveLength(1)
    expect(past.body.data[0].name).toBe('Past Temporal Batch')

    const current = await request(app)
      .get('/api/v1/batches?temporal=current')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(current.body.data).toHaveLength(1)
    expect(current.body.data[0].name).toBe('Current Temporal Batch')
  })

  it('rejects an invalid sort field', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/batches?sort=notAField:asc')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('caps the page size at the maximum allowed limit', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/batches?limit=1000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('excludes soft-deleted batches by default', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const { first } = await seedBatches(admin.accessToken)
    await request(app)
      .delete(`/api/v1/batches/${String(first.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
  })

  it('denies a TRAINER read access', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${trainer.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('denies a STUDENT read access', async () => {
    const student = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/batches/:id', () => {
  it('returns 404 for a nonexistent batch', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/batches/000000000000000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for a soft-deleted batch (never leaked via direct id)', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))
    await request(app)
      .delete(`/api/v1/batches/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/batches/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('never leaks raw Mongoose internals', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))

    const res = await request(app)
      .get(`/api/v1/batches/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.$__).toBeUndefined()
    expect(res.body.data._doc).toBeUndefined()
  })
})
