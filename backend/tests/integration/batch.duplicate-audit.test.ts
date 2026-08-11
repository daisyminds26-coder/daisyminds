import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture, validCreateBatchPayload } from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function createSourceBatch(accessToken: string) {
  const course = await createPublishedCourseFixture()
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(
      validCreateBatchPayload(course._id.toString(), {
        timezone: 'America/New_York',
        deliveryMode: 'OFFLINE',
        maxStudents: 40,
        minimumStudents: 5,
        tags: ['bootcamp', 'evening'],
        weeklySchedule: [{ dayOfWeek: 'TUESDAY', startTime: '18:00', endTime: '20:00' }],
        location: {
          venueName: 'Downtown Campus',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
        internalNotes: 'Do not publish externally yet',
      }),
    )
  await request(app)
    .post(`/api/v1/batches/${String(res.body.data.id)}/calendar-exceptions`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ calendarExceptions: [{ date: '2026-09-05', type: 'HOLIDAY', title: 'Founders Day' }] })

  const refreshed = await request(app)
    .get(`/api/v1/batches/${String(res.body.data.id)}`)
    .set('Authorization', `Bearer ${accessToken}`)
  return refreshed.body.data as Record<string, unknown>
}

describe('POST /api/v1/batches/:id/duplicate', () => {
  it('copies courseId/timezone/deliveryMode/weeklySchedule/capacity/location/tags into the new batch', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${String(source.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Duplicated Batch' })

    expect(res.status).toBe(201)
    expect(res.body.data.courseId).toBe(source.courseId)
    expect(res.body.data.timezone).toBe('America/New_York')
    expect(res.body.data.deliveryMode).toBe('OFFLINE')
    expect(res.body.data.weeklySchedule).toEqual(source.weeklySchedule)
    expect(res.body.data.maxStudents).toBe(40)
    expect(res.body.data.minimumStudents).toBe(5)
    expect(res.body.data.location.venueName).toBe('Downtown Campus')
    expect(res.body.data.tags).toEqual(['bootcamp', 'evening'])
  })

  it('does not copy the source batchCode (a new one is generated)', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${String(source.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Duplicated Batch Two' })

    expect(res.body.data.batchCode).not.toBe(source.batchCode)
    expect(res.body.data.batchCode).toMatch(/^DM-BAT-\d{4}-\d{6}$/)
  })

  it('the new batch is always DRAFT, regardless of the source batch status', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)
    await request(app)
      .post(`/api/v1/batches/${String(source.id)}/lifecycle/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/batches/${String(source.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Duplicated From Cancelled' })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('does not copy calendarExceptions or internalNotes', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)
    expect(source.calendarExceptions).toHaveLength(1)
    expect(source.internalNotes).toBe('Do not publish externally yet')

    const res = await request(app)
      .post(`/api/v1/batches/${String(source.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Duplicated Without Notes' })

    expect(res.body.data.calendarExceptions).toEqual([])
    expect(res.body.data.internalNotes).toBeNull()
  })

  it('requires a new name in the request body', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${String(source.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/batches/:id/audit', () => {
  it('is paginated', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)
    await request(app)
      .patch(`/api/v1/batches/${String(source.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ shortName: 'DB1' })

    const res = await request(app)
      .get(`/api/v1/batches/${String(source.id)}/audit?limit=1&page=1`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta.limit).toBe(1)
    expect(res.body.meta.total).toBeGreaterThan(1)
    expect(res.body.meta.totalPages).toBeGreaterThan(1)
  })

  it('contains the expected actions after a sequence of operations', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const source = await createSourceBatch(admin.accessToken)
    await request(app)
      .patch(`/api/v1/batches/${String(source.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ shortName: 'DB1' })
    await request(app)
      .post(`/api/v1/batches/${String(source.id)}/lifecycle/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/batches/${String(source.id)}/lifecycle/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/batches/${String(source.id)}/audit?limit=50`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const actions = (res.body.data as { action: string }[]).map((entry) => entry.action)
    expect(actions).toEqual(
      expect.arrayContaining([
        'batch.created',
        'batch.calendar_exceptions_changed',
        'batch.updated',
        'batch.cancelled',
        'batch.archived',
      ]),
    )
  })
})
