import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { extractCookie } from '../helpers/cookies'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

interface LoginResult {
  accessToken: string
  refreshCookie: string
}

async function login(email: string, password: string): Promise<LoginResult> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password })

  return {
    accessToken: res.body.data.accessToken as string,
    refreshCookie: extractCookie(res, 'refresh_token'),
  }
}

describe('GET /api/v1/auth/me', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('ADMIN', ['users:read', 'users:manage'])
    roleId = role._id.toString()
  })

  it('returns the current user with role and permissions', async () => {
    await createTestUser({ email: 'me@example.com', password: 'correct-horse-1', roleId })
    const { accessToken } = await login('me@example.com', 'correct-horse-1')

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('me@example.com')
    expect(res.body.data.role).toBe('ADMIN')
    expect(res.body.data.permissions).toEqual(['users:read', 'users:manage'])
  })

  it('rejects a request with no access token', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('rejects a request with a garbage access token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer garbage')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('revokes the current session so its refresh token no longer works', async () => {
    await createTestUser({ email: 'logout1@example.com', password: 'correct-horse-1', roleId })
    const { accessToken, refreshCookie } = await login('logout1@example.com', 'correct-horse-1')

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(logoutRes.status).toBe(200)

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie)
    expect(refreshRes.status).toBe(401)
  })
})

describe('POST /api/v1/auth/logout-all', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('revokes every session for the user, including other devices', async () => {
    await createTestUser({ email: 'logoutall@example.com', password: 'correct-horse-1', roleId })
    const deviceA = await login('logoutall@example.com', 'correct-horse-1')
    const deviceB = await login('logoutall@example.com', 'correct-horse-1')

    const res = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${deviceA.accessToken}`)
    expect(res.status).toBe(200)

    const refreshA = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', deviceA.refreshCookie)
    const refreshB = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', deviceB.refreshCookie)

    expect(refreshA.status).toBe(401)
    expect(refreshB.status).toBe(401)
  })
})

describe('GET /api/v1/auth/sessions and DELETE /api/v1/auth/sessions/:id', () => {
  let roleId: string

  beforeEach(async () => {
    const role = await createTestRole('STUDENT', [])
    roleId = role._id.toString()
  })

  it('lists active sessions and flags the current one', async () => {
    await createTestUser({ email: 'sessions1@example.com', password: 'correct-horse-1', roleId })
    const first = await login('sessions1@example.com', 'correct-horse-1')
    await login('sessions1@example.com', 'correct-horse-1')

    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${first.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data.filter((s: { isCurrent: boolean }) => s.isCurrent)).toHaveLength(1)
  })

  it('revokes a specific session by id', async () => {
    await createTestUser({ email: 'sessions2@example.com', password: 'correct-horse-1', roleId })
    const current = await login('sessions2@example.com', 'correct-horse-1')
    const other = await login('sessions2@example.com', 'correct-horse-1')

    const listRes = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${current.accessToken}`)
    const otherSession = (listRes.body.data as { id: string; isCurrent: boolean }[]).find(
      (session) => !session.isCurrent,
    )

    if (!otherSession) {
      throw new Error('Expected a second session to exist')
    }
    const otherSessionId = otherSession.id

    const revokeRes = await request(app)
      .delete(`/api/v1/auth/sessions/${otherSessionId}`)
      .set('Authorization', `Bearer ${current.accessToken}`)
    expect(revokeRes.status).toBe(200)

    const refreshOther = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', other.refreshCookie)
    expect(refreshOther.status).toBe(401)
  })

  it("returns 404 (not 403) when trying to revoke another user's session", async () => {
    await createTestUser({ email: 'victim@example.com', password: 'correct-horse-1', roleId })
    await createTestUser({ email: 'attacker@example.com', password: 'correct-horse-1', roleId })

    const victim = await login('victim@example.com', 'correct-horse-1')
    const attacker = await login('attacker@example.com', 'correct-horse-1')

    const victimSessions = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${victim.accessToken}`)
    const victimSessionId = victimSessions.body.data[0].id as string

    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${victimSessionId}`)
      .set('Authorization', `Bearer ${attacker.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('rejects a malformed session id', async () => {
    await createTestUser({ email: 'sessions3@example.com', password: 'correct-horse-1', roleId })
    const { accessToken } = await login('sessions3@example.com', 'correct-horse-1')

    const res = await request(app)
      .delete('/api/v1/auth/sessions/not-a-valid-id')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })
})
