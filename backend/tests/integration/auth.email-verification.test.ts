import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { enqueueAuthEmail } from '../../src/queues/auth-email.queue'
import { extractTokenFromEmailLink } from '../helpers/email'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

describe('POST /api/v1/auth/resend-verification', () => {
  let roleId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('queues a verification email for a PENDING_VERIFICATION account', async () => {
    await createTestUser({
      email: 'unverified@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'PENDING_VERIFICATION',
    })

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'unverified@example.com' })

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).toHaveBeenCalledOnce()
  })

  it('does not queue an email for an already-verified account, but still returns the generic response', async () => {
    await createTestUser({
      email: 'verified@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'ACTIVE',
    })

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'verified@example.com' })

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).not.toHaveBeenCalled()
  })

  it('returns the identical generic response for a nonexistent account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nobody@example.com' })

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/auth/verify-email', () => {
  let roleId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('verifies the email and activates a PENDING_VERIFICATION account', async () => {
    await createTestUser({
      email: 'toverify@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'PENDING_VERIFICATION',
    })
    await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'toverify@example.com' })

    const rawToken = extractTokenFromEmailLink(vi.mocked(enqueueAuthEmail))

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken })
    expect(res.status).toBe(200)

    const user = await UserModel.findOne({ email: 'toverify@example.com' })
    expect(user?.status).toBe('ACTIVE')
    expect(user?.emailVerifiedAt).not.toBeNull()

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'toverify@example.com', password: 'correct-horse-1' })
    expect(loginRes.status).toBe(200)
  })

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'never-issued-token' })

    expect(res.status).toBe(400)
  })
})
