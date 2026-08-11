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

async function createDraftBatch(accessToken: string) {
  const course = await createPublishedCourseFixture()
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateBatchPayload(course._id.toString()))
  return res.body.data.id as string
}

async function auditActions(accessToken: string, id: string) {
  const res = await request(app)
    .get(`/api/v1/batches/${id}/audit`)
    .set('Authorization', `Bearer ${accessToken}`)
  return (res.body.data as { action: string }[]).map((entry) => entry.action)
}

describe('POST /api/v1/batches/:id/trainers', () => {
  it('assigns a primary trainer and assistants', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)
    const primary = await createActiveTrainerFixture()
    const assistant1 = await createActiveTrainerFixture()
    const assistant2 = await createActiveTrainerFixture()

    const res = await request(app)
      .post(`/api/v1/batches/${id}/trainers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        primaryTrainerId: primary._id.toString(),
        assistantTrainerIds: [assistant1._id.toString(), assistant2._id.toString()],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.primaryTrainerId).toBe(primary._id.toString())
    expect(res.body.data.assistantTrainerIds).toEqual(
      expect.arrayContaining([assistant1._id.toString(), assistant2._id.toString()]),
    )
  })

  it('rejects a nonexistent trainer', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/trainers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ primaryTrainerId: '000000000000000000000000', assistantTrainerIds: [] })

    expect(res.status).toBe(400)
  })

  it('rejects duplicate assistants', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)
    const assistant = await createActiveTrainerFixture()

    const res = await request(app)
      .post(`/api/v1/batches/${id}/trainers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        primaryTrainerId: null,
        assistantTrainerIds: [assistant._id.toString(), assistant._id.toString()],
      })

    expect(res.status).toBe(400)
  })

  it('rejects the primary trainer also listed as an assistant', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)
    const trainer = await createActiveTrainerFixture()

    const res = await request(app)
      .post(`/api/v1/batches/${id}/trainers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        primaryTrainerId: trainer._id.toString(),
        assistantTrainerIds: [trainer._id.toString()],
      })

    expect(res.status).toBe(400)
  })

  it('writes a batch.trainers_changed audit entry', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)
    const primary = await createActiveTrainerFixture()

    await request(app)
      .post(`/api/v1/batches/${id}/trainers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ primaryTrainerId: primary._id.toString(), assistantTrainerIds: [] })

    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.trainers_changed')
  })
})

describe('POST /api/v1/batches/:id/weekly-schedule', () => {
  it('fully replaces the weekly schedule array', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        weeklySchedule: [
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
          { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '11:00' },
        ],
      })

    const res = await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: [{ dayOfWeek: 'FRIDAY', startTime: '14:00', endTime: '16:00' }] })

    expect(res.status).toBe(200)
    expect(res.body.data.weeklySchedule).toHaveLength(1)
    expect(res.body.data.weeklySchedule[0].dayOfWeek).toBe('FRIDAY')
  })

  it('rejects overlapping same-day slots', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        weeklySchedule: [
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
          { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '12:00' },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid HH:mm time format', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '9:00', endTime: '11:00' }] })

    expect(res.status).toBe(400)
  })

  it('rejects startTime >= endTime', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '11:00', endTime: '09:00' }] })

    expect(res.status).toBe(400)
  })

  it('rejects exceeding the max slot count (30)', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    const slots: { dayOfWeek: string; startTime: string; endTime: string }[] = []
    for (const day of days) {
      for (let hour = 0; hour < 6; hour += 1) {
        slots.push({
          dayOfWeek: day,
          startTime: `${String(hour).padStart(2, '0')}:00`,
          endTime: `${String(hour + 1).padStart(2, '0')}:00`,
        })
      }
    }
    expect(slots.length).toBeGreaterThan(30)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: slots.slice(0, 31) })

    expect(res.status).toBe(400)
  })

  it('writes a batch.timetable_changed audit entry', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    await request(app)
      .post(`/api/v1/batches/${id}/weekly-schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: [{ dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '10:00' }] })

    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.timetable_changed')
  })
})

describe('POST /api/v1/batches/:id/calendar-exceptions', () => {
  it('fully replaces the calendar exceptions array', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    await request(app)
      .post(`/api/v1/batches/${id}/calendar-exceptions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        calendarExceptions: [
          { date: '2026-09-05', type: 'HOLIDAY', title: 'Founders Day' },
          { date: '2026-09-12', type: 'NO_CLASS', title: 'Maintenance' },
        ],
      })

    const res = await request(app)
      .post(`/api/v1/batches/${id}/calendar-exceptions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ calendarExceptions: [{ date: '2026-10-01', type: 'OTHER', title: 'Replaced' }] })

    expect(res.status).toBe(200)
    expect(res.body.data.calendarExceptions).toHaveLength(1)
    expect(res.body.data.calendarExceptions[0].title).toBe('Replaced')
  })

  it('rejects duplicate exception dates', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/batches/${id}/calendar-exceptions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        calendarExceptions: [
          { date: '2026-09-05', type: 'HOLIDAY', title: 'Founders Day' },
          { date: '2026-09-05', type: 'OTHER', title: 'Duplicate' },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('writes a batch.calendar_exceptions_changed audit entry', async () => {
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })
    const id = await createDraftBatch(admin.accessToken)

    await request(app)
      .post(`/api/v1/batches/${id}/calendar-exceptions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        calendarExceptions: [{ date: '2026-09-05', type: 'HOLIDAY', title: 'Founders Day' }],
      })

    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.calendar_exceptions_changed')
  })
})
