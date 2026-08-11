import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { ensureTestRole } from '../helpers/seed'
import { validCreateTrainerPayload } from '../helpers/trainer-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

beforeEach(async () => {
  await ensureTestRole('TRAINER', [])
})

async function createAndLoginTrainer(adminToken: string, email: string) {
  const createRes = await request(app)
    .post('/api/v1/trainers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validCreateTrainerPayload({ email, sendInvitation: false }))
  const trainerId = createRes.body.data.id as string

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'correct-horse-1' })

  return { trainerId, accessToken: loginRes.body.data.accessToken as string }
}

describe('trainer sessions — SUPER_ADMIN only', () => {
  it('SUPER_ADMIN can list and force-revoke a session', async () => {
    const superAdmin = await loginAs({ email: 'sa1@example.com', role: 'SUPER_ADMIN' })
    const { trainerId } = await createAndLoginTrainer(
      superAdmin.accessToken,
      'sessions1@example.com',
    )

    const listRes = await request(app)
      .get(`/api/v1/trainers/${trainerId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data).toHaveLength(1)

    const sessionId = listRes.body.data[0].id as string
    const revokeRes = await request(app)
      .delete(`/api/v1/trainers/${trainerId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(revokeRes.status).toBe(200)

    const afterRes = await request(app)
      .get(`/api/v1/trainers/${trainerId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(afterRes.body.data).toHaveLength(0)
  })

  it('SUPER_ADMIN can force-logout every session at once', async () => {
    const superAdmin = await loginAs({ email: 'sa2@example.com', role: 'SUPER_ADMIN' })
    const { trainerId } = await createAndLoginTrainer(
      superAdmin.accessToken,
      'sessions2@example.com',
    )

    const res = await request(app)
      .post(`/api/v1/trainers/${trainerId}/logout-all`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(res.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/v1/trainers/${trainerId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.body.data).toHaveLength(0)
  })

  it('an ADMIN is denied session access even though they hold trainers:manage', async () => {
    const superAdmin = await loginAs({ email: 'sa3@example.com', role: 'SUPER_ADMIN' })
    const admin = await loginAs({ email: 'admin-sessions@example.com', role: 'ADMIN' })
    const { trainerId } = await createAndLoginTrainer(
      superAdmin.accessToken,
      'sessions3@example.com',
    )

    const res = await request(app)
      .get(`/api/v1/trainers/${trainerId}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/trainers/:id/audit-log — SUPER_ADMIN only', () => {
  it('records an audit entry for trainer creation with no sensitive data', async () => {
    const superAdmin = await loginAs({ email: 'sa4@example.com', role: 'SUPER_ADMIN' })

    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'audited@example.com' }))
    const trainerId = createRes.body.data.id as string

    const res = await request(app)
      .get(`/api/v1/trainers/${trainerId}/audit-log`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(res.status).toBe(200)
    const createdEntry = res.body.data.find(
      (entry: { action: string }) => entry.action === 'trainer.created',
    )
    expect(createdEntry).toBeDefined()
    expect(JSON.stringify(createdEntry)).not.toMatch(/password/i)
    expect(createdEntry.metadata.trainerId).toBe(createRes.body.data.trainerId)
  })

  it('records a dedicated audit entry when availability changes', async () => {
    const superAdmin = await loginAs({ email: 'sa5@example.com', role: 'SUPER_ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'availchange@example.com' }))
    const trainerId = createRes.body.data.id as string

    await request(app)
      .patch(`/api/v1/trainers/${trainerId}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({
        availability: [
          {
            dayOfWeek: 'FRIDAY',
            startTime: '09:00',
            endTime: '11:00',
            timeZone: 'Asia/Kolkata',
            type: 'AVAILABLE',
          },
        ],
      })

    const res = await request(app)
      .get(`/api/v1/trainers/${trainerId}/audit-log`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(
      res.body.data.some(
        (entry: { action: string }) => entry.action === 'trainer.availability_changed',
      ),
    ).toBe(true)
  })

  it('records a dedicated audit entry when employment status changes', async () => {
    const superAdmin = await loginAs({ email: 'sa6@example.com', role: 'SUPER_ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'empchange@example.com' }))
    const trainerId = createRes.body.data.id as string

    await request(app)
      .patch(`/api/v1/trainers/${trainerId}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({ employmentStatus: 'ON_LEAVE' })

    const res = await request(app)
      .get(`/api/v1/trainers/${trainerId}/audit-log`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const entry = res.body.data.find(
      (item: { action: string }) => item.action === 'trainer.employment_status_changed',
    )
    expect(entry).toBeDefined()
    expect(entry.metadata).toMatchObject({ previousStatus: 'ACTIVE', newStatus: 'ON_LEAVE' })
  })

  it('an ADMIN is denied audit access', async () => {
    const superAdmin = await loginAs({ email: 'sa7@example.com', role: 'SUPER_ADMIN' })
    const admin = await loginAs({ email: 'admin-audit@example.com', role: 'ADMIN' })

    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'audited2@example.com' }))

    const res = await request(app)
      .get(`/api/v1/trainers/${createRes.body.data.id as string}/audit-log`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })
})
