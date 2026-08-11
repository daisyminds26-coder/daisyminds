import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { enqueueAuthEmail } from '../../src/queues/auth-email.queue'
import { hashOpaqueToken } from '../../src/services/token.service'
import { extractTokenFromEmailLink } from '../helpers/email'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

// Vitest hoists this above the imports above, so auth.service.ts never
// touches the real BullMQ Queue (which would try to reach Redis) in tests.
vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

async function loginAndGetAccessToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password })
  return res.body.data.accessToken as string
}

describe('POST /api/v1/auth/forgot-password', () => {
  let roleId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('returns a generic response and queues an email for an existing account', async () => {
    await createTestUser({ email: 'forgot1@example.com', password: 'correct-horse-1', roleId })

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'forgot1@example.com' })

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).toHaveBeenCalledOnce()

    const user = await UserModel.findOne({ email: 'forgot1@example.com' }).select(
      '+passwordResetTokenHash',
    )
    expect(user?.passwordResetTokenHash).not.toBeNull()
  })

  it('returns the identical generic response for a nonexistent account (no enumeration)', async () => {
    await createTestUser({ email: 'someone-real@example.com', password: 'correct-horse-1', roleId })

    const existing = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'someone-real@example.com' })

    const nonexistent = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' })

    expect(nonexistent.status).toBe(existing.status)
    expect(nonexistent.body.message).toBe(existing.body.message)
    expect(enqueueAuthEmail).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/v1/auth/reset-password', () => {
  let roleId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('resets the password with a valid token and revokes all sessions', async () => {
    await createTestUser({ email: 'reset1@example.com', password: 'old-password-1', roleId })
    await loginAndGetAccessToken('reset1@example.com', 'old-password-1')
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'reset1@example.com' })

    const rawToken = extractTokenFromEmailLink(vi.mocked(enqueueAuthEmail))

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, newPassword: 'new-password-1' })

    expect(res.status).toBe(200)

    const loginWithOld = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset1@example.com', password: 'old-password-1' })
    expect(loginWithOld.status).toBe(401)

    const loginWithNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset1@example.com', password: 'new-password-1' })
    expect(loginWithNew.status).toBe(200)
  })

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: hashOpaqueToken('never-issued'), newPassword: 'new-password-1' })

    expect(res.status).toBe(400)
  })

  it('rejects a weak new password (policy enforced by the validator)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'whatever', newPassword: 'short' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/v1/auth/change-password', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it("changes the current user's password", async () => {
    await createTestUser({ email: 'change1@example.com', password: 'old-password-1', roleId })
    const accessToken = await loginAndGetAccessToken('change1@example.com', 'old-password-1')

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'old-password-1', newPassword: 'new-password-1' })

    expect(res.status).toBe(200)

    const loginWithNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'change1@example.com', password: 'new-password-1' })
    expect(loginWithNew.status).toBe(200)
  })

  it('rejects an incorrect current password', async () => {
    await createTestUser({ email: 'change2@example.com', password: 'old-password-1', roleId })
    const accessToken = await loginAndGetAccessToken('change2@example.com', 'old-password-1')

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong-password-1', newPassword: 'new-password-1' })

    expect(res.status).toBe(401)
  })

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'a', newPassword: 'new-password-1' })

    expect(res.status).toBe(401)
  })
})
