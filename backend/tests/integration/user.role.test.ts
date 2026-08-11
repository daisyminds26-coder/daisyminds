import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { loginAs } from '../helpers/auth'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

describe('PATCH /api/v1/users/:id/role', () => {
  it('assigns a new role to a user', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const trainerRole = await createTestRole('TRAINER', [])
    const target = await loginAs({ email: 'target1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .patch(`/api/v1/users/${target.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ roleId: trainerRole._id.toString() })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('TRAINER')
  })

  it('rejects a nonexistent roleId', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const target = await loginAs({ email: 'target2@example.com', role: 'STUDENT' })

    const res = await request(app)
      .patch(`/api/v1/users/${target.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ roleId: '000000000000000000000000' })

    expect(res.status).toBe(400)
  })

  it('blocks an ADMIN from granting SUPER_ADMIN (privilege escalation)', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const superAdminRole = await createTestRole('SUPER_ADMIN', ['users:manage'])
    const target = await loginAs({ email: 'target3@example.com', role: 'STUDENT' })

    const res = await request(app)
      .patch(`/api/v1/users/${target.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ roleId: superAdminRole._id.toString() })

    expect(res.status).toBe(403)
  })

  it("blocks an ADMIN from changing an existing SUPER_ADMIN's role at all", async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const superAdmin = await loginAs({ email: 'super1@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .patch(`/api/v1/users/${superAdmin.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ roleId: studentRole._id.toString() })

    expect(res.status).toBe(403)
  })

  it('allows a SUPER_ADMIN to demote another SUPER_ADMIN when more than one remains active', async () => {
    const superAdmin1 = await loginAs({ email: 'super2@example.com', role: 'SUPER_ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const superAdmin2 = await createTestUser({
      email: 'super3@example.com',
      password: 'correct-horse-1',
      roleId: superAdmin1.roleId,
      status: 'ACTIVE',
    })

    const res = await request(app)
      .patch(`/api/v1/users/${superAdmin2._id.toString()}/role`)
      .set('Authorization', `Bearer ${superAdmin1.accessToken}`)
      .send({ roleId: studentRole._id.toString() })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('STUDENT')
  })

  it('blocks demoting the last active SUPER_ADMIN (JWT-staleness scenario)', async () => {
    const actor = await loginAs({ email: 'super4@example.com', role: 'SUPER_ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const target = await createTestUser({
      email: 'super5@example.com',
      password: 'correct-horse-1',
      roleId: actor.roleId,
      status: 'ACTIVE',
    })
    await UserModel.updateOne({ _id: actor.userId }, { status: 'DEACTIVATED' })

    const res = await request(app)
      .patch(`/api/v1/users/${target._id.toString()}/role`)
      .set('Authorization', `Bearer ${actor.accessToken}`)
      .send({ roleId: studentRole._id.toString() })

    expect(res.status).toBe(422)
  })

  it('allows a SUPER_ADMIN to grant SUPER_ADMIN to another user', async () => {
    const superAdmin = await loginAs({ email: 'super6@example.com', role: 'SUPER_ADMIN' })
    const target = await loginAs({ email: 'target4@example.com', role: 'STUDENT' })

    const res = await request(app)
      .patch(`/api/v1/users/${target.userId}/role`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({ roleId: superAdmin.roleId })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('SUPER_ADMIN')
  })
})
