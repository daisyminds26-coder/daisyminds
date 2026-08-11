import express, { type Express, type Request } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { errorHandler } from '../../src/middlewares/error-handler.middleware'
import { requireOwnership } from '../../src/middlewares/ownership.middleware'
import { requireAuth } from '../../src/middlewares/require-auth.middleware'
import { requirePermission } from '../../src/middlewares/require-permission.middleware'
import { requireRole } from '../../src/middlewares/require-role.middleware'
import { signAccessToken } from '../../src/services/token.service'
import type { AuthenticatedUser } from '../../src/types/auth'

function loadOwnedFixture(req: Request): Promise<{ userId: { toString(): string } } | null> {
  if (req.params.id === 'owned-by-caller') {
    return Promise.resolve({ userId: { toString: () => req.user?.id ?? '' } })
  }
  if (req.params.id === 'owned-by-someone-else') {
    return Promise.resolve({ userId: { toString: () => 'someone-else-id' } })
  }
  return Promise.resolve(null)
}

function buildTestApp(): Express {
  const app = express()
  app.use(express.json())

  app.get('/admin-only', requireAuth, requireRole('ADMIN'), (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/needs-permission', requireAuth, requirePermission('users:manage'), (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/owned/:id', requireAuth, requireOwnership(loadOwnedFixture), (_req, res) => {
    res.json({ ok: true })
  })

  app.use(errorHandler)
  return app
}

function tokenFor(overrides: Partial<AuthenticatedUser> = {}): string {
  const user: AuthenticatedUser = {
    id: 'user-1',
    roleId: 'role-1',
    role: 'STUDENT',
    permissions: [],
    sessionId: 'session-1',
    ...overrides,
  }
  return signAccessToken(user)
}

const app = buildTestApp()

describe('requireRole', () => {
  it('allows a matching role', async () => {
    const token = tokenFor({ role: 'ADMIN' })
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('rejects a non-matching role with 403', async () => {
    const token = tokenFor({ role: 'STUDENT' })
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/admin-only')
    expect(res.status).toBe(401)
  })
})

describe('requirePermission', () => {
  it('allows a user with the required permission', async () => {
    const token = tokenFor({ permissions: ['users:manage'] })
    const res = await request(app).get('/needs-permission').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('rejects a user missing the required permission', async () => {
    const token = tokenFor({ permissions: ['users:read'] })
    const res = await request(app).get('/needs-permission').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe('requireOwnership', () => {
  it('allows the owner', async () => {
    const token = tokenFor({ id: 'user-1' })
    const res = await request(app)
      .get('/owned/owned-by-caller')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('returns 404 (not 403) for a resource owned by someone else', async () => {
    const token = tokenFor({ id: 'user-1' })
    const res = await request(app)
      .get('/owned/owned-by-someone-else')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 for a resource that does not exist', async () => {
    const token = tokenFor({ id: 'user-1' })
    const res = await request(app)
      .get('/owned/does-not-exist')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
