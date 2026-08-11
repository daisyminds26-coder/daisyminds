import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createTestUser, ensureTestRole } from '../helpers/seed'
import { validCreateTrainerPayload } from '../helpers/trainer-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

beforeEach(async () => {
  await ensureTestRole('TRAINER', [])
})

async function createTrainer(accessToken: string, email: string) {
  const res = await request(app)
    .post('/api/v1/trainers')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateTrainerPayload({ email }))
  return res.body.data.id as string
}

describe('POST /api/v1/trainers/bulk', () => {
  it('bulk-deactivates multiple trainers', async () => {
    const admin = await loginAs({ email: 'bulk-admin1@example.com', role: 'ADMIN' })
    const id1 = await createTrainer(admin.accessToken, 'bulk1@example.com')
    const id2 = await createTrainer(admin.accessToken, 'bulk2@example.com')

    const res = await request(app)
      .post('/api/v1/trainers/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'deactivate', trainerIds: [id1, id2] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual(expect.arrayContaining([id1, id2]))
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('reports a per-item failure without aborting the rest of the batch', async () => {
    const admin = await loginAs({ email: 'bulk-admin2@example.com', role: 'ADMIN' })
    const validId = await createTrainer(admin.accessToken, 'bulk3@example.com')
    const missingId = '000000000000000000000000'

    const res = await request(app)
      .post('/api/v1/trainers/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'activate', trainerIds: [validId, missingId] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([validId])
    expect(res.body.data.failed).toEqual([{ id: missingId, reason: 'Trainer not found' }])
  })

  it('bulk soft-deletes then bulk-restores', async () => {
    const admin = await loginAs({ email: 'bulk-admin3@example.com', role: 'ADMIN' })
    const id = await createTrainer(admin.accessToken, 'bulk4@example.com')

    const deleteRes = await request(app)
      .post('/api/v1/trainers/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'delete', trainerIds: [id] })
    expect(deleteRes.body.data.succeeded).toEqual([id])

    const restoreRes = await request(app)
      .post('/api/v1/trainers/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'restore', trainerIds: [id] })
    expect(restoreRes.body.data.succeeded).toEqual([id])
  })

  it('rejects a batch larger than 100 ids', async () => {
    const admin = await loginAs({ email: 'bulk-admin4@example.com', role: 'ADMIN' })
    const ids = Array.from({ length: 101 }, () => '000000000000000000000000')

    const res = await request(app)
      .post('/api/v1/trainers/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'activate', trainerIds: ids })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/trainers/export', () => {
  it('exports the filtered set as CSV with a safe column header', async () => {
    const admin = await loginAs({ email: 'export-admin1@example.com', role: 'ADMIN' })
    await createTrainer(admin.accessToken, 'export1@example.com')

    const res = await request(app)
      .get('/api/v1/trainers/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.text.split('\r\n')[0]).toBe(
      'trainerId,fullName,email,designation,department,primaryExpertise,yearsOfExperience,employmentType,employmentStatus,accountStatus,profileCompletionStatus',
    )
    expect(res.text).toContain('export1@example.com')
  })

  it('respects the current filter (department)', async () => {
    const admin = await loginAs({ email: 'export-admin2@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({ email: 'export-eng@example.com', department: 'Engineering' }),
      )
    await createTrainer(admin.accessToken, 'export-other@example.com')

    const res = await request(app)
      .get('/api/v1/trainers/export?department=Engineering')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).toContain('export-eng@example.com')
    expect(res.text).not.toContain('export-other@example.com')
  })

  it('neutralizes a leading formula-trigger character (CSV/formula injection)', async () => {
    const admin = await loginAs({ email: 'export-admin3@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'formula@example.com', firstName: '=cmd|/c calc' }))

    const res = await request(app)
      .get('/api/v1/trainers/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).not.toMatch(/,=cmd/)
    expect(res.text).toContain("'=cmd|/c calc")
  })

  it('denies export to a role without trainers:export', async () => {
    const trainerRole = await ensureTestRole('TRAINER', [])
    await createTestUser({
      email: 'export-denied@example.com',
      password: 'correct-horse-1',
      roleId: trainerRole._id.toString(),
    })
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'export-denied@example.com', password: 'correct-horse-1' })

    const res = await request(app)
      .get('/api/v1/trainers/export')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken as string}`)

    expect(res.status).toBe(403)
  })
})
