import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { BatchModel } from '../../src/models/batch.model'
import { loginAs } from '../helpers/auth'
import {
  createActiveTrainerFixture,
  createPublishedCourseFixture,
  readyToScheduleBatchPayload,
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
  return { id: res.body.data.id as string, course }
}

async function auditActions(accessToken: string, id: string) {
  const res = await request(app)
    .get(`/api/v1/batches/${id}/audit`)
    .set('Authorization', `Bearer ${accessToken}`)
  return (res.body.data as { action: string }[]).map((entry) => entry.action)
}

describe('PATCH /api/v1/batches/:id', () => {
  it('updates allowed fields', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Renamed Batch', shortName: 'RB' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Renamed Batch')
    expect(res.body.data.shortName).toBe('RB')
  })

  it('rejects courseId in the body (immutable, strict schema)', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const { id, course } = await createDraftBatch(admin.accessToken)
    const otherCourse = await createPublishedCourseFixture()

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ courseId: otherCourse._id.toString() })

    expect(res.status).toBe(400)

    const batch = await BatchModel.findById(id)
    expect(batch?.courseId.toString()).toBe(course._id.toString())
  })

  it('rejects batchCode in the body', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ batchCode: 'DM-BAT-2020-000001' })

    expect(res.status).toBe(400)
  })

  it('rejects status in the body (lifecycle must go through explicit endpoints)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'ACTIVE' })

    expect(res.status).toBe(400)
  })

  /**
   * Regression test for a data-loss bug caught during initial test-writing:
   * `updateBatchSchema` used to be a bare `batchBaseSchema.omit({courseId:
   * true}).partial()`, and several base fields carried a Zod `.default()`
   * (`weeklySchedule`/`calendarExceptions`/`assistantTrainerIds`/`tags`
   * defaulting to `[]`, `waitlistEnabled` to `false`). `.partial()` does NOT
   * prevent a field's own `.default()` from resolving when the key is
   * omitted — a bare `{ name: '...' }` PATCH used to parse with
   * `weeklySchedule: []`, `assistantTrainerIds: []`, `tags: []`,
   * `waitlistEnabled: false` regardless, and since `updateBatch` spreads
   * `...input` into the `$set`, this silently wiped those fields (and fired
   * their change-specific audit events) on every PATCH that didn't re-send
   * them. Fixed by removing `.default()` from `batchBaseSchema` itself
   * (kept bare/optional, so `.partial()` genuinely means "leave the omitted
   * key unchanged") and re-adding `.default()` only on `createBatchSchema`,
   * where "omitted at creation" should mean "start empty." This test locks
   * in the correct behavior.
   */
  it('a name-only PATCH leaves weeklySchedule/assistantTrainerIds/tags/waitlistEnabled untouched', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const assistant = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          primaryTrainerId: trainer._id.toString(),
          assistantTrainerIds: [assistant._id.toString()],
          tags: ['cohort-a'],
          weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '20:00' }],
          waitlistEnabled: true,
        }),
      )
    const id = created.body.data.id as string
    expect(created.body.data.weeklySchedule).toHaveLength(1)
    expect(created.body.data.assistantTrainerIds).toEqual([assistant._id.toString()])

    const patched = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Just A Rename' })

    expect(patched.status).toBe(200)
    expect(patched.body.data.name).toBe('Just A Rename')
    expect(patched.body.data.weeklySchedule).toHaveLength(1)
    expect(patched.body.data.assistantTrainerIds).toEqual([assistant._id.toString()])
    expect(patched.body.data.tags).toEqual(['cohort-a'])
    expect(patched.body.data.waitlistEnabled).toBe(true)

    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.updated')
    expect(actions).not.toContain('batch.capacity_changed')
    expect(actions).not.toContain('batch.timetable_changed')
    expect(actions).not.toContain('batch.calendar_exceptions_changed')
    expect(actions).not.toContain('batch.location_changed')
  })

  it('writes batch.timetable_changed when weeklySchedule is intentionally replaced', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:00' }] })

    expect(res.status).toBe(200)
    expect(res.body.data.weeklySchedule).toHaveLength(1)
    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.timetable_changed')
  })

  it('writes batch.calendar_exceptions_changed when calendarExceptions is intentionally replaced', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const res = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        calendarExceptions: [{ date: '2026-09-05', type: 'HOLIDAY', title: 'Founders Day' }],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.calendarExceptions).toHaveLength(1)
    const actions = await auditActions(admin.accessToken, id)
    expect(actions).toContain('batch.calendar_exceptions_changed')
  })

  it('writes batch.location_changed only when location fields actually differ from current values', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const { id } = await createDraftBatch(admin.accessToken)

    const first = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ location: { venueName: 'Main Campus Hall' } })
    expect(first.status).toBe(200)

    // Re-submitting the exact same location must not fire the event again.
    await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ location: { venueName: 'Main Campus Hall' } })

    const actions = await auditActions(admin.accessToken, id)
    const locationChangedCount = actions.filter(
      (action) => action === 'batch.location_changed',
    ).length
    expect(locationChangedCount).toBe(1)
  })

  it('applies a full readiness-configuring update built from readyToScheduleBatchPayload', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const trainer = await createActiveTrainerFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))

    const { courseId, ...updatePayload } = readyToScheduleBatchPayload(
      course._id.toString(),
      trainer._id.toString(),
    )
    // `courseId` must be stripped before sending (updateBatchSchema is strict and
    // rejects it), but assert the fixture returned the expected one so the
    // destructured binding isn't simply discarded.
    expect(courseId).toBe(course._id.toString())
    const res = await request(app)
      .patch(`/api/v1/batches/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(updatePayload)

    expect(res.status).toBe(200)
    expect(res.body.data.primaryTrainerId).toBe(trainer._id.toString())
    expect(res.body.data.weeklySchedule).toHaveLength(1)
  })
})
