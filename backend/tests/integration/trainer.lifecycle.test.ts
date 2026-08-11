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

async function createTrainer(
  accessToken: string,
  overrides: Parameters<typeof validCreateTrainerPayload>[0] = {},
) {
  const res = await request(app)
    .post('/api/v1/trainers')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateTrainerPayload(overrides))
  return res.body.data as { id: string; trainerId: string; profileCompletionPercentage: number }
}

describe('PATCH /api/v1/trainers/:id', () => {
  it('updates permitted profile fields and recalculates profile completion', async () => {
    const admin = await loginAs({ email: 'update-admin@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update1@example.com' })
    expect(trainer.profileCompletionPercentage).toBe(0)

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        dateOfBirth: '1990-05-01T00:00:00.000Z',
        gender: 'MALE',
        designation: 'Senior Trainer',
        department: 'Engineering',
        expertiseAreas: ['React', 'Node.js'],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.designation).toBe('Senior Trainer')
    expect(res.body.data.expertiseAreas).toEqual(['React', 'Node.js'])
    // basic identity + professional groups now complete (2/7 ≈ 29%)
    expect(res.body.data.profileCompletionPercentage).toBe(29)
  })

  it('leaves fields not present in the request unchanged (true partial update)', async () => {
    const admin = await loginAs({ email: 'update-admin2@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, {
      email: 'update2@example.com',
      firstName: 'Original',
    })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ notes: 'A short note' })

    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Original')
    expect(res.body.data.notes).toBe('A short note')
  })

  it('rejects mass-assignment of email/role/trainerId (not part of the update schema)', async () => {
    const admin = await loginAs({ email: 'update-admin3@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update3@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'hijacked@example.com', role: 'SUPER_ADMIN', trainerId: 'DM-TRN-2020-000001' })

    expect(res.status).toBe(400)
  })

  it('rejects a certification whose expiry date is before its issue date', async () => {
    const admin = await loginAs({ email: 'update-admin4@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update4@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        certifications: [
          {
            name: 'AWS Certified',
            issuingOrganization: 'Amazon',
            issueDate: '2024-01-01T00:00:00.000Z',
            expiryDate: '2023-01-01T00:00:00.000Z',
          },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('rejects overlapping availability slots of the same type on the same day', async () => {
    const admin = await loginAs({ email: 'update-admin5@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update5@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        availability: [
          {
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '11:00',
            timeZone: 'Asia/Kolkata',
            type: 'AVAILABLE',
          },
          {
            dayOfWeek: 'MONDAY',
            startTime: '10:00',
            endTime: '12:00',
            timeZone: 'Asia/Kolkata',
            type: 'AVAILABLE',
          },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('allows a BLOCKED slot to overlap an AVAILABLE slot on the same day', async () => {
    const admin = await loginAs({ email: 'update-admin6@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update6@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        availability: [
          {
            dayOfWeek: 'TUESDAY',
            startTime: '09:00',
            endTime: '17:00',
            timeZone: 'Asia/Kolkata',
            type: 'AVAILABLE',
          },
          {
            dayOfWeek: 'TUESDAY',
            startTime: '13:00',
            endTime: '14:00',
            timeZone: 'Asia/Kolkata',
            type: 'BLOCKED',
          },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.availability).toHaveLength(2)
  })

  it('rejects a start time that is not before the end time', async () => {
    const admin = await loginAs({ email: 'update-admin7@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update7@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        availability: [
          {
            dayOfWeek: 'WEDNESDAY',
            startTime: '15:00',
            endTime: '10:00',
            timeZone: 'Asia/Kolkata',
            type: 'AVAILABLE',
          },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('rejects an unrecognized time zone', async () => {
    const admin = await loginAs({ email: 'update-admin8@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'update8@example.com' })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        availability: [
          {
            dayOfWeek: 'THURSDAY',
            startTime: '09:00',
            endTime: '10:00',
            timeZone: 'Not/AZone',
            type: 'AVAILABLE',
          },
        ],
      })

    expect(res.status).toBe(400)
  })
})

describe('trainer lifecycle actions', () => {
  it('activates and deactivates a trainer, revoking sessions on deactivate', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin1@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, {
      email: 'lifecycle1@example.com',
      sendInvitation: false,
    })

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle1@example.com', password: 'correct-horse-1' })
    expect(loginRes.status).toBe(200)

    const deactivateRes = await request(app)
      .post(`/api/v1/trainers/${trainer.id}/deactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deactivateRes.status).toBe(200)
    expect(deactivateRes.body.data.status).toBe('DEACTIVATED')

    const refreshRes = await request(app).post('/api/v1/auth/refresh')
    expect(refreshRes.status).toBe(401)

    const activateRes = await request(app)
      .post(`/api/v1/trainers/${trainer.id}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(activateRes.status).toBe(200)
    expect(activateRes.body.data.status).toBe('ACTIVE')
  })

  it('soft-deletes a trainer (linked user only) and restores it', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin2@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'lifecycle2@example.com' })

    const deleteRes = await request(app)
      .delete(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const getDeletedRes = await request(app)
      .get(`/api/v1/trainers/${trainer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(getDeletedRes.status).toBe(200)
    expect(getDeletedRes.body.data.isDeleted).toBe(true)

    const restoreRes = await request(app)
      .post(`/api/v1/trainers/${trainer.id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.isDeleted).toBe(false)
  })

  it('rejects restoring a trainer that is not deleted', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin3@example.com', role: 'ADMIN' })
    const trainer = await createTrainer(admin.accessToken, { email: 'lifecycle3@example.com' })

    const res = await request(app)
      .post(`/api/v1/trainers/${trainer.id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })

  it('resends an invitation only while PENDING_VERIFICATION', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin4@example.com', role: 'ADMIN' })
    const pendingTrainer = await createTrainer(admin.accessToken, { email: 'pending@example.com' })
    const activeTrainer = await createTrainer(admin.accessToken, {
      email: 'already-active@example.com',
      sendInvitation: false,
    })

    const resendRes = await request(app)
      .post(`/api/v1/trainers/${pendingTrainer.id}/resend-invitation`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(resendRes.status).toBe(200)

    const rejectedRes = await request(app)
      .post(`/api/v1/trainers/${activeTrainer.id}/resend-invitation`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(rejectedRes.status).toBe(422)
  })

  it('returns a safe 404 acting on a nonexistent trainer', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin5@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers/000000000000000000000000/activate')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })
})
