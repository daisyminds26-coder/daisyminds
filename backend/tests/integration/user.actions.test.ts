import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { enqueueAuthEmail } from '../../src/queues/auth-email.queue'
import { loginAs } from '../helpers/auth'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

describe('POST /api/v1/users/:id/reset-password', () => {
  it('queues a password-reset email', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/users/${target.userId}/reset-password`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).toHaveBeenCalledWith(
      'password-reset',
      expect.objectContaining({ email: 'target1@example.com' }),
    )
  })
})

describe('POST /api/v1/users/:id/resend-verification', () => {
  it('resends for a PENDING_VERIFICATION user', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const target = await createTestUser({
      email: 'pending1@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
      status: 'PENDING_VERIFICATION',
    })

    const res = await request(app)
      .post(`/api/v1/users/${target._id.toString()}/resend-verification`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(enqueueAuthEmail).toHaveBeenCalledWith(
      'email-verification',
      expect.objectContaining({ email: 'pending1@example.com' }),
    )
  })

  it('rejects for an already-verified user', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'active1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/users/${target.userId}/resend-verification`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })
})

describe('user sessions (SUPER_ADMIN only)', () => {
  it('lets a SUPER_ADMIN list and force-revoke a session', async () => {
    const superAdmin = await loginAs({ email: 'super1@example.com', role: 'SUPER_ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    await createTestUser({
      email: 'target2@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
    })
    const targetLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'target2@example.com', password: 'correct-horse-1' })
    const targetUserId = targetLogin.body.data.user.id as string

    const listRes = await request(app)
      .get(`/api/v1/users/${targetUserId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data).toHaveLength(1)

    const sessionId = listRes.body.data[0].id as string
    const revokeRes = await request(app)
      .delete(`/api/v1/users/${targetUserId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(revokeRes.status).toBe(200)
  })

  it('rejects an ADMIN (users:manage is not enough — SUPER_ADMIN only per DATABASE.md §3.1)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target3@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get(`/api/v1/users/${target.userId}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('force-logs-out all sessions for a user', async () => {
    const superAdmin = await loginAs({ email: 'super2@example.com', role: 'SUPER_ADMIN' })
    const target = await loginAs({ email: 'target4@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/users/${target.userId}/logout-all`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(res.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/v1/users/${target.userId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.body.data).toHaveLength(0)
  })
})

describe('POST /api/v1/users/bulk', () => {
  it('activates multiple users and reports per-item results', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const userA = await createTestUser({
      email: 'bulk1@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
      status: 'DEACTIVATED',
    })
    const userB = await createTestUser({
      email: 'bulk2@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
      status: 'DEACTIVATED',
    })

    const res = await request(app)
      .post('/api/v1/users/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'activate', userIds: [userA._id.toString(), userB._id.toString()] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toHaveLength(2)
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('reports a per-item failure without aborting the rest of the batch', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const okUser = await createTestUser({
      email: 'bulk3@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
    })

    const res = await request(app)
      .post('/api/v1/users/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'deactivate', userIds: [okUser._id.toString(), admin.userId] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([okUser._id.toString()])
    expect(res.body.data.failed).toHaveLength(1)
    expect(res.body.data.failed[0].id).toBe(admin.userId)
  })
})

describe('GET /api/v1/users/export', () => {
  it('returns a CSV file', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/users/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('email,role,status')
    expect(res.text).toContain('admin7@example.com')
  })
})

describe('GET /api/v1/users/:id/audit-log', () => {
  it('records and returns audit entries — SUPER_ADMIN only', async () => {
    const superAdmin = await loginAs({ email: 'super3@example.com', role: 'SUPER_ADMIN' })
    const target = await loginAs({ email: 'target5@example.com', role: 'STUDENT' })

    await request(app)
      .post(`/api/v1/users/${target.userId}/deactivate`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/users/${target.userId}/audit-log`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0].action).toBe('user.deactivated')
  })

  it('rejects an ADMIN', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target6@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get(`/api/v1/users/${target.userId}/audit-log`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })
})
