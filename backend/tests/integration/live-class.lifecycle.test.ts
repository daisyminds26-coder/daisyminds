import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createActiveTrainerFixture, createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { bearer, createScheduledBatchFixture } from '../helpers/live-class-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function setupAdminAndBatch() {
  const admin = await loginAs({
    email: `live-class-admin-${String(Date.now())}@example.com`,
    role: 'ADMIN',
  })
  const trainer = await createActiveTrainerFixture()
  const course = await createPublishedCourseFixture()
  const batch = await createScheduledBatchFixture(course._id.toString(), {
    primaryTrainerId: trainer._id.toString(),
  })
  return { admin, trainer, course, batch }
}

function validSessionPayload(batchId: string, overrides: Record<string, unknown> = {}) {
  return {
    batchId,
    title: 'Week 1 — Introduction',
    startDateTime: '2026-09-07T13:00:00.000Z',
    endDateTime: '2026-09-07T15:00:00.000Z',
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    provider: 'MANUAL_LINK',
    joinUrl: 'https://meet.example.com/room-1',
    trainerIds: [],
    ...overrides,
  }
}

describe('Admin Live Classes — creation, conflicts, generation, lifecycle', () => {
  it('creates a manual session with a server-generated DM-CLS-{year}-{seq} code, status DRAFT', async () => {
    const { admin, batch } = await setupAdminAndBatch()

    const res = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send(validSessionPayload(batch._id.toString()))

    expect(res.status).toBe(201)
    expect(res.body.data.sessionCode).toMatch(/^DM-CLS-\d{4}-\d{6}$/)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('rejects a session scheduled outside the batch date range unless an overrideReason is given', async () => {
    const { admin, batch } = await setupAdminAndBatch()
    const outsideRangePayload = validSessionPayload(batch._id.toString(), {
      startDateTime: '2027-01-07T13:00:00.000Z',
      endDateTime: '2027-01-07T15:00:00.000Z',
    })

    const rejected = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send(outsideRangePayload)
    expect(rejected.status).toBe(409)

    const accepted = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send({ ...outsideRangePayload, overrideReason: 'Makeup session after term end' })
    expect(accepted.status).toBe(201)
  })

  it('rejects a trainer double-booking unless an overrideReason is given', async () => {
    const { admin, trainer, batch } = await setupAdminAndBatch()
    const first = validSessionPayload(batch._id.toString(), {
      trainerIds: [trainer._id.toString()],
      primaryTrainerId: trainer._id.toString(),
    })
    const created = await request(app).post('/api/v1/live-classes').set(bearer(admin)).send(first)
    expect(created.status).toBe(201)
    await request(app)
      .post(`/api/v1/live-classes/${String(created.body.data.id)}/schedule`)
      .set(bearer(admin))

    const overlapping = validSessionPayload(batch._id.toString(), {
      title: 'Overlapping session',
      trainerIds: [trainer._id.toString()],
      primaryTrainerId: trainer._id.toString(),
    })
    const conflict = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send(overlapping)
    expect(conflict.status).toBe(409)

    const overridden = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send({ ...overlapping, overrideReason: 'Trainer covering two batches today' })
    expect(overridden.status).toBe(201)
  })

  it('generates sessions from the batch weekly timetable and skips duplicates on a second call', async () => {
    const { admin, batch } = await setupAdminAndBatch()
    const range = { batchId: batch._id.toString(), startDate: '2026-09-01', endDate: '2026-09-30' }

    const preview = await request(app)
      .post('/api/v1/live-classes/generate/preview')
      .set(bearer(admin))
      .send(range)
    expect(preview.status).toBe(200)
    expect(preview.body.data.length).toBeGreaterThan(0)

    const firstGenerate = await request(app)
      .post('/api/v1/live-classes/generate')
      .set(bearer(admin))
      .send(range)
    expect(firstGenerate.status).toBe(200)
    const createdCount = firstGenerate.body.data.created.length
    expect(createdCount).toBeGreaterThan(0)
    expect(firstGenerate.body.data.skipped).toBe(0)

    const secondGenerate = await request(app)
      .post('/api/v1/live-classes/generate')
      .set(bearer(admin))
      .send(range)
    expect(secondGenerate.status).toBe(200)
    expect(secondGenerate.body.data.created.length).toBe(0)
    expect(secondGenerate.body.data.skipped).toBe(createdCount)
  })

  it('excludes a calendar-exception date from the generation preview', async () => {
    const admin = await loginAs({
      email: `live-class-admin-cal-${String(Date.now())}@example.com`,
      role: 'ADMIN',
    })
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString(), {
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T00:00:00.000Z'),
      weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '20:00' }],
      calendarExceptions: [
        { date: new Date('2026-09-07T00:00:00.000Z'), title: 'Institute holiday' },
      ],
    })

    const preview = await request(app)
      .post('/api/v1/live-classes/generate/preview')
      .set(bearer(admin))
      .send({ batchId: batch._id.toString(), startDate: '2026-09-01', endDate: '2026-09-30' })

    expect(preview.status).toBe(200)
    const dates = (preview.body.data as { scheduledDate: string }[]).map((row) => row.scheduledDate)
    expect(dates).not.toContain('2026-09-07')
  })

  it('walks a session through DRAFT -> SCHEDULED -> LIVE -> COMPLETED, rejecting an out-of-order jump', async () => {
    const { admin, batch } = await setupAdminAndBatch()
    const created = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send(validSessionPayload(batch._id.toString()))
    const id = created.body.data.id as string

    const skipAhead = await request(app).post(`/api/v1/live-classes/${id}/start`).set(bearer(admin))
    expect(skipAhead.status).toBe(409)

    const scheduled = await request(app)
      .post(`/api/v1/live-classes/${id}/schedule`)
      .set(bearer(admin))
    expect(scheduled.body.data.status).toBe('SCHEDULED')

    const live = await request(app).post(`/api/v1/live-classes/${id}/start`).set(bearer(admin))
    expect(live.body.data.status).toBe('LIVE')

    const completed = await request(app)
      .post(`/api/v1/live-classes/${id}/complete`)
      .set(bearer(admin))
    expect(completed.body.data.status).toBe('COMPLETED')
  })

  it('cancels a scheduled session with a reason, and refuses to cancel it a second time', async () => {
    const { admin, batch } = await setupAdminAndBatch()
    const created = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(admin))
      .send(validSessionPayload(batch._id.toString()))
    const id = created.body.data.id as string
    await request(app).post(`/api/v1/live-classes/${id}/schedule`).set(bearer(admin))

    const cancelled = await request(app)
      .post(`/api/v1/live-classes/${id}/cancel`)
      .set(bearer(admin))
      .send({ reason: 'Trainer unavailable' })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.status).toBe('CANCELLED')

    const secondCancel = await request(app)
      .post(`/api/v1/live-classes/${id}/cancel`)
      .set(bearer(admin))
      .send({ reason: 'Trying again' })
    expect(secondCancel.status).toBe(409)
  })

  it('forbids creating a session with only live_classes:read (no :manage) permission', async () => {
    // Deliberately does not reuse `setupAdminAndBatch()` — `loginAs({ role: 'ADMIN' })`
    // inserts a fresh `Role` document keyed by name, and calling it twice for the
    // same role in one test (once for the full-permission admin, once for this
    // restricted actor) would violate the unique index on `roles.name`.
    const trainer = await createActiveTrainerFixture()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString(), {
      primaryTrainerId: trainer._id.toString(),
    })
    const readOnly = await loginAs({
      email: `live-class-readonly-${String(Date.now())}@example.com`,
      role: 'ADMIN',
      permissions: ['live_classes:read'],
    })

    const res = await request(app)
      .post('/api/v1/live-classes')
      .set(bearer(readOnly))
      .send(validSessionPayload(batch._id.toString()))

    expect(res.status).toBe(403)
  })
})
