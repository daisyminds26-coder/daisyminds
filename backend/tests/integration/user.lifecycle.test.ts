import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { loginAs } from '../helpers/auth'
import { createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

describe('POST /api/v1/users/:id/deactivate', () => {
  it('deactivates a user and revokes their sessions', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/users/${target.userId}/deactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DEACTIVATED')

    const refreshRes = await request(app).post('/api/v1/auth/refresh')
    expect(refreshRes.status).toBe(401)
  })

  it('blocks an admin from deactivating their own account', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post(`/api/v1/users/${admin.userId}/deactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })

  it('blocks an ADMIN from deactivating a SUPER_ADMIN', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const superAdmin = await loginAs({ email: 'super1@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .post(`/api/v1/users/${superAdmin.userId}/deactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('deactivating one of two active SUPER_ADMINs is allowed (one still remains)', async () => {
    const superAdmin1 = await loginAs({ email: 'super2@example.com', role: 'SUPER_ADMIN' })
    const superAdmin2 = await createTestUser({
      email: 'super3@example.com',
      password: 'correct-horse-1',
      roleId: superAdmin1.roleId,
      status: 'ACTIVE',
    })

    const res = await request(app)
      .post(`/api/v1/users/${superAdmin2._id.toString()}/deactivate`)
      .set('Authorization', `Bearer ${superAdmin1.accessToken}`)

    expect(res.status).toBe(200)
  })

  it('blocks the count from reaching zero active SUPER_ADMINs', async () => {
    // Simulates the JWT-staleness window (SECURITY.md §1): the acting
    // SUPER_ADMIN's access token is still valid, but their own DB record
    // was already deactivated by someone else moments earlier — the count
    // guard, not the self-block (which only fires for literal self-action),
    // is what must catch this.
    const actor = await loginAs({ email: 'super5@example.com', role: 'SUPER_ADMIN' })
    const target = await createTestUser({
      email: 'super6@example.com',
      password: 'correct-horse-1',
      roleId: actor.roleId,
      status: 'ACTIVE',
    })
    await UserModel.updateOne({ _id: actor.userId }, { status: 'DEACTIVATED' })

    const res = await request(app)
      .post(`/api/v1/users/${target._id.toString()}/deactivate`)
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(422)
  })
})

describe('POST /api/v1/users/:id/activate', () => {
  it('reactivates a deactivated user and clears lockout state', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const target = await createTestUser({
      email: 'locked-target@example.com',
      password: 'correct-horse-1',
      roleId: admin.roleId,
      status: 'DEACTIVATED',
    })
    await UserModel.updateOne({ _id: target._id }, { failedLoginAttempts: 5 })

    const res = await request(app)
      .post(`/api/v1/users/${target._id.toString()}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ACTIVE')

    const reloaded = await UserModel.findById(target._id)
    expect(reloaded?.failedLoginAttempts).toBe(0)
  })
})

describe('DELETE /api/v1/users/:id (soft delete) and restore', () => {
  it('soft-deletes then restores a user', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target2@example.com', role: 'STUDENT' })

    const deleteRes = await request(app)
      .delete(`/api/v1/users/${target.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/v1/users/${target.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(listRes.status).toBe(404)

    const restoreRes = await request(app)
      .post(`/api/v1/users/${target.userId}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.isDeleted).toBe(false)
  })

  it('blocks an admin from deleting their own account', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })

    const res = await request(app)
      .delete(`/api/v1/users/${admin.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })

  it('rejects restoring a user who is not deleted', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target3@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/users/${target.userId}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })
})
