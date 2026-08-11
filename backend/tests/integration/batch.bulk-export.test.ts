import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { generateOpenApiDocument } from '../../src/config/swagger'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture, validCreateBatchPayload } from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function createBatch(
  accessToken: string,
  overrides: Parameters<typeof validCreateBatchPayload>[1] = {},
) {
  const course = await createPublishedCourseFixture()
  const res = await request(app)
    .post('/api/v1/batches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateBatchPayload(course._id.toString(), overrides))
  return res.body.data.id as string
}

async function createCancelledBatch(accessToken: string) {
  const id = await createBatch(accessToken)
  await request(app)
    .post(`/api/v1/batches/${id}/lifecycle/cancel`)
    .set('Authorization', `Bearer ${accessToken}`)
  return id
}

describe('POST /api/v1/batches/bulk/archive', () => {
  it('archives multiple eligible batches', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id1 = await createCancelledBatch(admin.accessToken)
    const id2 = await createCancelledBatch(admin.accessToken)

    const res = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', batchIds: [id1, id2] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual(expect.arrayContaining([id1, id2]))
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('reports a per-item failure without blocking the rest of the batch (a DRAFT batch cannot archive directly)', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const draftId = await createBatch(admin.accessToken)
    const cancelledId = await createCancelledBatch(admin.accessToken)

    const res = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', batchIds: [draftId, cancelledId] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([cancelledId])
    expect(res.body.data.failed).toEqual([{ id: draftId, reason: expect.any(String) }])
  })

  it('rejects a batchIds array larger than the max allowed size (100)', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const ids = Array.from({ length: 101 }, () => '000000000000000000000000')

    const res = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', batchIds: ids })

    expect(res.status).toBe(400)
  })

  it('writes a batch.bulk_action audit entry', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createCancelledBatch(admin.accessToken)

    await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', batchIds: [id] })

    const auditRes = await request(app)
      .get(`/api/v1/batches/${id}/audit`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const actions = (auditRes.body.data as { action: string }[]).map((entry) => entry.action)
    expect(actions).toContain('batch.archived')
  })
})

describe('GET /api/v1/batches/export', () => {
  it('exports a CSV respecting the active filter', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    await createBatch(admin.accessToken, { name: 'Exported Online Batch', deliveryMode: 'ONLINE' })
    await createBatch(admin.accessToken, {
      name: 'Excluded Offline Batch',
      deliveryMode: 'OFFLINE',
    })

    const res = await request(app)
      .get('/api/v1/batches/export?deliveryMode=ONLINE')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('Exported Online Batch')
    expect(res.text).not.toContain('Excluded Offline Batch')
  })

  it('neutralizes a leading formula-trigger character in name (CSV/formula injection)', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    await createBatch(admin.accessToken, { name: '=SUM(A1:A10)' })

    const res = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).toContain("'=SUM(A1:A10)")
  })

  it('does not include internalNotes or full address fields in the CSV', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateBatchPayload(course._id.toString(), {
          name: 'Confidential Batch',
          internalNotes: 'SECRET-INTERNAL-NOTE-XYZ',
          deliveryMode: 'OFFLINE',
          location: {
            venueName: 'Secret Venue',
            addressLine1: 'SECRET-ADDRESS-LINE-123',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postalCode: '600001',
            country: 'India',
          },
        }),
      )

    const res = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).not.toContain('SECRET-INTERNAL-NOTE-XYZ')
    expect(res.text).not.toContain('SECRET-ADDRESS-LINE-123')
  })

  it('requires the batches:export permission, distinct from batches:manage', async () => {
    const restrictedAdmin = await loginAs({
      email: 'restricted1@example.com',
      role: 'ADMIN',
      permissions: ['batches:read', 'batches:manage'],
    })

    const res = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${restrictedAdmin.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('denies a TRAINER export access', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${trainer.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('OpenAPI registration', () => {
  it('registers the batches paths in the generated OpenAPI document', () => {
    const document = generateOpenApiDocument()
    expect(document.paths['/batches']).toBeDefined()
    expect(document.paths['/batches/{id}/lifecycle/schedule']).toBeDefined()
    expect(document.paths['/batches/bulk/archive']).toBeDefined()
    expect(document.paths['/batches/{id}/weekly-schedule']).toBeDefined()
  })
})

describe('malformed request parameters', () => {
  it('returns 400 (not 500) for a malformed ObjectId in the :id param', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/batches/not-a-valid-object-id')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })
})
