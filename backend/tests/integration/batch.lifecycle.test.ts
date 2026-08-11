import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import {
  createActiveTrainerFixture,
  createPublishedCourseFixture,
  readyToScheduleBatchPayload,
  validCreateBatchPayload,
} from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

/** A DRAFT batch fully configured to pass the readiness check. */
async function createReadyBatch(accessToken: string) {
  const course = await createPublishedCourseFixture()
  const trainer = await createActiveTrainerFixture()
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(readyToScheduleBatchPayload(course._id.toString(), trainer._id.toString()))
  return res.body.data.id as string
}

async function createBareDraftBatch(accessToken: string) {
  const course = await createPublishedCourseFixture()
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateBatchPayload(course._id.toString()))
  return res.body.data.id as string
}

function lifecycleAction(accessToken: string, id: string, action: string) {
  return request(app)
    .post(`/api/v1/batches/${id}/lifecycle/${action}`)
    .set('Authorization', `Bearer ${accessToken}`)
}

async function auditActions(accessToken: string, id: string) {
  const res = await request(app)
    .get(`/api/v1/batches/${id}/audit`)
    .set('Authorization', `Bearer ${accessToken}`)
  return (res.body.data as { action: string }[]).map((entry) => entry.action)
}

describe('legal lifecycle transitions', () => {
  it('DRAFT -> SCHEDULED (schedule) writes batch.scheduled', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)

    const res = await lifecycleAction(admin.accessToken, id, 'schedule')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('SCHEDULED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.scheduled')
  })

  it('DRAFT -> SCHEDULED rejects with 422 and structured blockers when not ready', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)

    const res = await lifecycleAction(admin.accessToken, id, 'schedule')

    expect(res.status).toBe(422)
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  it('SCHEDULED -> DRAFT (unschedule) writes batch.unscheduled', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')

    const res = await lifecycleAction(admin.accessToken, id, 'unschedule')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DRAFT')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.unscheduled')
  })

  it('SCHEDULED -> ACTIVE (activate) writes batch.activated', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')

    const res = await lifecycleAction(admin.accessToken, id, 'activate')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ACTIVE')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.activated')
  })

  it('ACTIVE -> COMPLETED (complete) writes batch.completed', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')
    await lifecycleAction(admin.accessToken, id, 'activate')

    const res = await lifecycleAction(admin.accessToken, id, 'complete')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.completed')
  })

  it('DRAFT -> CANCELLED writes batch.cancelled', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)

    const res = await lifecycleAction(admin.accessToken, id, 'cancel')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.cancelled')
  })

  it('SCHEDULED -> CANCELLED writes batch.cancelled', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')

    const res = await lifecycleAction(admin.accessToken, id, 'cancel')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.cancelled')
  })

  it('ACTIVE -> CANCELLED writes batch.cancelled', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')
    await lifecycleAction(admin.accessToken, id, 'activate')

    const res = await lifecycleAction(admin.accessToken, id, 'cancel')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.cancelled')
  })

  it('COMPLETED -> ARCHIVED writes batch.archived', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')
    await lifecycleAction(admin.accessToken, id, 'activate')
    await lifecycleAction(admin.accessToken, id, 'complete')

    const res = await lifecycleAction(admin.accessToken, id, 'archive')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ARCHIVED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.archived')
  })

  it('CANCELLED -> ARCHIVED writes batch.archived', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'cancel')

    const res = await lifecycleAction(admin.accessToken, id, 'archive')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ARCHIVED')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.archived')
  })

  it('ARCHIVED -> DRAFT (restore) writes batch.restored', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'cancel')
    await lifecycleAction(admin.accessToken, id, 'archive')

    const res = await lifecycleAction(admin.accessToken, id, 'restore')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DRAFT')
    expect(await auditActions(admin.accessToken, id)).toContain('batch.restored')
  })
})

describe('illegal lifecycle transitions (409)', () => {
  it('DRAFT -> ACTIVE is rejected (cannot skip SCHEDULED)', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)

    const res = await lifecycleAction(admin.accessToken, id, 'activate')

    expect(res.status).toBe(409)
  })

  it('COMPLETED -> ACTIVE is rejected', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')
    await lifecycleAction(admin.accessToken, id, 'activate')
    await lifecycleAction(admin.accessToken, id, 'complete')

    const res = await lifecycleAction(admin.accessToken, id, 'activate')

    expect(res.status).toBe(409)
  })

  it('CANCELLED -> ACTIVE is rejected', async () => {
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'cancel')

    const res = await lifecycleAction(admin.accessToken, id, 'activate')

    expect(res.status).toBe(409)
  })

  it('ARCHIVED -> ACTIVE is rejected', async () => {
    const admin = await loginAs({ email: 'admin15@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'cancel')
    await lifecycleAction(admin.accessToken, id, 'archive')

    const res = await lifecycleAction(admin.accessToken, id, 'activate')

    expect(res.status).toBe(409)
  })

  it('DRAFT -> COMPLETED is rejected', async () => {
    const admin = await loginAs({ email: 'admin16@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)

    const res = await lifecycleAction(admin.accessToken, id, 'complete')

    expect(res.status).toBe(409)
  })
})

describe('soft delete and restore', () => {
  it('DELETE /:id hides the batch from list and get', async () => {
    const admin = await loginAs({ email: 'admin17@example.com', role: 'ADMIN' })
    const id = await createBareDraftBatch(admin.accessToken)

    const deleteRes = await request(app)
      .delete(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const getRes = await request(app)
      .get(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(getRes.status).toBe(404)

    const listRes = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect((listRes.body.data as { id: string }[]).some((b) => b.id === id)).toBe(false)
  })

  it('lifecycle/restore on a soft-deleted batch un-deletes it without touching its status', async () => {
    const admin = await loginAs({ email: 'admin18@example.com', role: 'ADMIN' })
    const id = await createReadyBatch(admin.accessToken)
    await lifecycleAction(admin.accessToken, id, 'schedule')
    await request(app)
      .delete(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await lifecycleAction(admin.accessToken, id, 'restore')

    expect(res.status).toBe(200)
    expect(res.body.data.isDeleted).toBe(false)
    expect(res.body.data.status).toBe('SCHEDULED')
  })
})
