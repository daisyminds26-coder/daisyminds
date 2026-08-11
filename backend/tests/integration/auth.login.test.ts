import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { setupTestDatabase } from '../setup-db'
import { createTestRole, createTestUser } from '../helpers/seed'

setupTestDatabase()

describe('POST /api/v1/auth/login', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', ['courses:read'])
    roleId = role._id.toString()
  })

  it('logs in with correct credentials and sets a refresh cookie', async () => {
    await createTestUser({ email: 'student@example.com', password: 'correct-horse-1', roleId })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@example.com', password: 'correct-horse-1' })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toEqual(expect.any(String))
    expect(res.body.data.user.email).toBe('student@example.com')
    expect(res.body.data.user.role).toBe('STUDENT')
    expect(res.body.data.user).not.toHaveProperty('passwordHash')

    const setCookieHeader = res.headers['set-cookie']
    expect(Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader).toContain(
      'refresh_token=',
    )
  })

  it('rejects a wrong password with a generic message', async () => {
    await createTestUser({ email: 'student2@example.com', password: 'correct-horse-1', roleId })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student2@example.com', password: 'wrong-password-1' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('rejects a nonexistent email with the same generic message as a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-1' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('locks the account after LOGIN_MAX_ATTEMPTS failed attempts', async () => {
    await createTestUser({ email: 'lockout@example.com', password: 'correct-horse-1', roleId })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'lockout@example.com', password: 'wrong-password-1' })
    }

    const lockedUser = await UserModel.findOne({ email: 'lockout@example.com' })
    expect(lockedUser?.status).toBe('LOCKED')

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lockout@example.com', password: 'correct-horse-1' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('ACCOUNT_LOCKED')
    expect(res.body.message).toMatch(/temporarily locked/i)
    expect(res.body.details.lockedUntil).toEqual(expect.any(String))
    expect(new Date(res.body.details.lockedUntil as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects login for a PENDING_VERIFICATION account with a distinguishable error code', async () => {
    await createTestUser({
      email: 'unverified@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'PENDING_VERIFICATION',
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unverified@example.com', password: 'correct-horse-1' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('rejects login for a SUSPENDED account and reveals the suspension', async () => {
    await createTestUser({
      email: 'suspended@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'SUSPENDED',
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.com', password: 'correct-horse-1' })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/suspended/i)
  })

  it('rejects login for a DEACTIVATED account with the same generic message (no disclosure)', async () => {
    await createTestUser({
      email: 'deactivated@example.com',
      password: 'correct-horse-1',
      roleId,
      status: 'DEACTIVATED',
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deactivated@example.com', password: 'correct-horse-1' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('rejects a request with an unknown extra field (strict validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@example.com', password: 'x', isAdmin: true })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })
})
