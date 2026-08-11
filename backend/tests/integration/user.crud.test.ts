import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { UserModel } from '../../src/models/user.model'
import { loginAs, type LoggedInActor } from '../helpers/auth'
import { createTestRole, createTestUser } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

describe('GET /api/v1/users', () => {
  let admin: LoggedInActor
  let studentRoleId: string

  beforeEach(async () => {
    admin = await loginAs({ email: 'admin@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    studentRoleId = studentRole._id.toString()

    await UserModel.insertMany(
      Array.from({ length: 5 }, (_, index) => ({
        email: `student${String(index)}@example.com`,
        passwordHash: 'x',
        roleId: studentRoleId,
        status: index % 2 === 0 ? 'ACTIVE' : 'SUSPENDED',
      })),
    )
  })

  it('lists users with pagination meta', async () => {
    const res = await request(app)
      .get('/api/v1/users?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2 })
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6) // 5 students + admin
  })

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/v1/users?status=SUSPENDED')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(
      (res.body.data as { status: string }[]).every((user) => user.status === 'SUSPENDED'),
    ).toBe(true)
  })

  it('searches by email prefix', async () => {
    const res = await request(app)
      .get('/api/v1/users?search=student0')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].email).toBe('student0@example.com')
  })

  it('excludes soft-deleted users by default', async () => {
    const target = await UserModel.findOne({ email: 'student0@example.com' })
    await UserModel.updateOne({ _id: target?._id }, { isDeleted: true, deletedAt: new Date() })

    const res = await request(app)
      .get('/api/v1/users?search=student0')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(0)
  })

  it('rejects a STUDENT (no users:read permission)', async () => {
    // Reuses the STUDENT role already created in `beforeEach` — calling
    // `loginAs` here would try to create a second "STUDENT" role and violate
    // the unique index on `roles.name`.
    await createTestUser({
      email: 'plain-student@example.com',
      password: 'correct-horse-1',
      roleId: studentRoleId,
    })
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'plain-student@example.com', password: 'correct-horse-1' })

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken as string}`)

    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/users/:id', () => {
  it('returns a single user', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get(`/api/v1/users/${admin.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('admin2@example.com')
    expect(res.body.data.role).toBe('ADMIN')
  })

  it('returns 404 for a nonexistent id', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/users/000000000000000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/users', () => {
  it('creates a user as PENDING_VERIFICATION and sends a verification email by default', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'newbie@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('PENDING_VERIFICATION')
    expect(res.body.data.emailVerifiedAt).toBeNull()
  })

  it('creates a user as ACTIVE when sendVerificationEmail is false', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'preverified@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
        sendVerificationEmail: false,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('ACTIVE')
    expect(res.body.data.emailVerifiedAt).not.toBeNull()
  })

  it('rejects a duplicate email', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'dupe@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'dupe@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })

    expect(res.status).toBe(409)
  })

  it('rejects a weak password', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'weak@example.com', password: 'short', roleId: studentRole._id.toString() })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('blocks an ADMIN from creating a SUPER_ADMIN account (privilege escalation)', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const superAdminRole = await createTestRole('SUPER_ADMIN', ['users:manage'])

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'sneaky@example.com',
        password: 'correct-horse-1',
        roleId: superAdminRole._id.toString(),
      })

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/v1/users/:id', () => {
  it("updates a user's email", async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'before@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })

    const res = await request(app)
      .patch(`/api/v1/users/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'after@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('after@example.com')
  })

  it('rejects updating to an email already in use', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const studentRole = await createTestRole('STUDENT', [])
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'taken@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'movable@example.com',
        password: 'correct-horse-1',
        roleId: studentRole._id.toString(),
      })

    const res = await request(app)
      .patch(`/api/v1/users/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'taken@example.com' })

    expect(res.status).toBe(409)
  })
})
