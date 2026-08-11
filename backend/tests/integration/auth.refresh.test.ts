import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { UserSessionModel } from '../../src/models/user-session.model'
import { extractCookie } from '../helpers/cookies'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password })
  return extractCookie(res, 'refresh_token')
}

describe('POST /api/v1/auth/refresh', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('rotates the refresh token and issues a new access token', async () => {
    await createTestUser({ email: 'refresh1@example.com', password: 'correct-horse-1', roleId })
    const cookie = await loginAndGetCookie('refresh1@example.com', 'correct-horse-1')

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toEqual(expect.any(String))

    const newCookie = res.headers['set-cookie']
    expect(newCookie).toBeDefined()
  })

  it('rejects a request with no refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('detects reuse of an already-rotated refresh token and revokes the session', async () => {
    await createTestUser({ email: 'refresh2@example.com', password: 'correct-horse-1', roleId })
    const originalCookie = await loginAndGetCookie('refresh2@example.com', 'correct-horse-1')

    // First refresh — legitimate, rotates the token.
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie)
    expect(firstRefresh.status).toBe(200)

    // Replaying the OLD (now-stale) cookie is a reuse — must be rejected...
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', originalCookie)
    expect(replay.status).toBe(401)

    // ...and must revoke the session, so even the NEW (legitimately rotated) token stops working.
    const newCookie = extractCookie(firstRefresh, 'refresh_token')
    const followUp = await request(app).post('/api/v1/auth/refresh').set('Cookie', newCookie)
    expect(followUp.status).toBe(401)
  })

  it('rejects a refresh for an expired session', async () => {
    await createTestUser({ email: 'refresh3@example.com', password: 'correct-horse-1', roleId })
    const cookie = await loginAndGetCookie('refresh3@example.com', 'correct-horse-1')

    await UserSessionModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) })

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)
    expect(res.status).toBe(401)
  })

  it('rejects a malformed cookie value', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=not-a-valid-format')

    expect(res.status).toBe(401)
  })
})
