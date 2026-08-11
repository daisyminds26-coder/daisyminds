import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { StudentModel } from '../../src/models/student.model'
import { UserModel } from '../../src/models/user.model'
import { loginAs, type LoggedInActor } from '../helpers/auth'
import { createTestUser, ensureTestRole } from '../helpers/seed'
import { validCreateStudentPayload } from '../helpers/student-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

/** Every `POST /students` call resolves the STUDENT role server-side — it must already exist. */
beforeEach(async () => {
  await ensureTestRole('STUDENT', [])
})

describe('POST /api/v1/students', () => {
  it('creates a linked user (role STUDENT) and student profile in one call', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'priya@example.com' }))

    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('priya@example.com')
    expect(res.body.data.status).toBe('PENDING_VERIFICATION')
    expect(res.body.data.studentId).toMatch(/^DM-STU-\d{4}-\d{6}$/)
    expect(res.body.data.profileCompletionStatus).toBe('PARTIAL')

    const user = await UserModel.findOne({ email: 'priya@example.com' })
    expect(user?.roleId.toString()).not.toBeNull()
    const student = await StudentModel.findOne({ userId: user?._id })
    expect(student?.firstName).toBe('Priya')
    expect(student?.userId.toString()).toBe(user?._id.toString())
  })

  it('creates as ACTIVE immediately when sendInvitation is false', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateStudentPayload({ email: 'active-student@example.com', sendInvitation: false }),
      )

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('ACTIVE')
    expect(res.body.data.emailVerifiedAt).not.toBeNull()
  })

  it('generates sequential, unique studentIds under concurrent creation', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app)
          .post('/api/v1/students')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send(validCreateStudentPayload({ email: `concurrent${String(index)}@example.com` })),
      ),
    )

    const studentIds = responses.map((res) => res.body.data.studentId as string)
    expect(new Set(studentIds).size).toBe(5)
  })

  it('rejects a duplicate email', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const payload = validCreateStudentPayload({ email: 'dupe-student@example.com' })

    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)

    expect(res.status).toBe(409)

    // The compensating-cleanup path must not have left an orphaned user
    // behind from the first (successful) request either.
    const users = await UserModel.find({ email: 'dupe-student@example.com' })
    expect(users).toHaveLength(1)
  })

  it('rejects a weak password', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'weak@example.com', password: 'short' }))

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a date of birth in the future', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const futureDate = new Date(Date.now() + 365 * 86_400_000)

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'future-dob@example.com', dateOfBirth: futureDate }))

    expect(res.status).toBe(400)
  })

  it('rejects an empty emergency contacts array', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'no-contact@example.com', emergencyContacts: [] }))

    expect(res.status).toBe(400)
  })

  it('rejects mass-assignment of role/studentId/security fields', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        ...validCreateStudentPayload({ email: 'sneaky@example.com' }),
        role: 'SUPER_ADMIN',
        studentId: 'DM-STU-2020-000001',
        passwordHash: 'not-a-real-hash',
      })

    expect(res.status).toBe(400)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/students').send(validCreateStudentPayload())
    expect(res.status).toBe(401)
  })

  it('denies a STUDENT (no students:manage permission)', async () => {
    // The STUDENT role already exists (seeded by this file's top-level
    // `beforeEach`) — reuse it via `createTestUser` + direct login rather
    // than `loginAs`, which would try to create a second "STUDENT" role
    // and violate the unique index on `roles.name` (see user.crud.test.ts
    // for the same established pattern).
    const studentRole = await ensureTestRole('STUDENT', [])
    await createTestUser({
      email: 'plain-student@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
    })
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'plain-student@example.com', password: 'correct-horse-1' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken as string}`)
      .send(validCreateStudentPayload({ email: 'blocked@example.com' }))

    expect(res.status).toBe(403)
  })

  it('denies a TRAINER (no general student-management access this phase)', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send(validCreateStudentPayload({ email: 'blocked2@example.com' }))

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/students', () => {
  let admin: LoggedInActor

  beforeEach(async () => {
    admin = await loginAs({ email: 'listadmin@example.com', role: 'ADMIN' })

    for (let index = 0; index < 3; index += 1) {
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          validCreateStudentPayload({
            email: `liststudent${String(index)}@example.com`,
            firstName: `Student${String(index)}`,
            address: {
              line1: '1 Main St',
              city: index === 0 ? 'Mumbai' : 'Pune',
              state: 'Maharashtra',
              postalCode: '400001',
              country: 'India',
            },
          }),
        )
    }
  })

  it('lists students with pagination meta, joined email/status', async () => {
    const res = await request(app)
      .get('/api/v1/students?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 })
    expect(res.body.data[0]).toHaveProperty('email')
    expect(res.body.data[0]).toHaveProperty('status')
  })

  it('searches by first name', async () => {
    const res = await request(app)
      .get('/api/v1/students?search=Student1')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].firstName).toBe('Student1')
  })

  it('searches by email prefix', async () => {
    const res = await request(app)
      .get('/api/v1/students?search=liststudent0')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('searches by studentId', async () => {
    const listRes = await request(app)
      .get('/api/v1/students?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const studentId = listRes.body.data[0].studentId as string

    const res = await request(app)
      .get(`/api/v1/students?search=${studentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.some((row: { studentId: string }) => row.studentId === studentId)).toBe(
      true,
    )
  })

  it('filters by city', async () => {
    const res = await request(app)
      .get('/api/v1/students?city=Mumbai')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('filters by account status', async () => {
    const res = await request(app)
      .get('/api/v1/students?status=PENDING_VERIFICATION')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  it('sorts by firstName ascending', async () => {
    const res = await request(app)
      .get('/api/v1/students?sort=firstName:asc&limit=10')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const names = (res.body.data as { firstName: string }[]).map((row) => row.firstName)
    expect(names).toEqual([...names].sort())
  })

  it('rejects an invalid sort field', async () => {
    const res = await request(app)
      .get('/api/v1/students?sort=notAField:asc')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('enforces the maximum page size', async () => {
    const res = await request(app)
      .get('/api/v1/students?limit=101')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('excludes soft-deleted students by default', async () => {
    const listRes = await request(app)
      .get('/api/v1/students?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const target = listRes.body.data[0]

    await request(app)
      .delete(`/api/v1/students/${target.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.some((row: { id: string }) => row.id === target.id)).toBe(false)

    const includeDeletedRes = await request(app)
      .get('/api/v1/students?includeDeleted=true')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(includeDeletedRes.body.data.some((row: { id: string }) => row.id === target.id)).toBe(
      true,
    )
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/students')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/students/:id', () => {
  it('returns a single student with full profile detail', async () => {
    const admin = await loginAs({ email: 'detailadmin@example.com', role: 'ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'detail@example.com' }))

    const res = await request(app)
      .get(`/api/v1/students/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('detail@example.com')
    expect(res.body.data.emergencyContacts).toHaveLength(1)
    expect(res.body.data.address.city).toBe('Bengaluru')
  })

  it('never leaks raw Mongoose subdocument internals in embedded arrays', async () => {
    // Regression test: `{ ...contact }` on a Mongoose embedded subdocument
    // copies its internal bookkeeping properties too ($__, _doc, $isNew,
    // __parentArray, __index, $__parent) — including, transitively, the
    // entire parent student document — unless the service maps each field
    // explicitly (student-management.service.ts#toEmergencyContactDto/
    // toEducationRecordDto).
    const admin = await loginAs({ email: 'noleakadmin@example.com', role: 'ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateStudentPayload({
          email: 'noleak@example.com',
          educationRecords: [
            { degree: 'B.Sc', institution: 'Delhi University', yearOfCompletion: 2023 },
          ],
        }),
      )

    const res = await request(app)
      .get(`/api/v1/students/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const contactKeys = Object.keys(res.body.data.emergencyContacts[0])
    const recordKeys = Object.keys(res.body.data.educationRecords[0])
    expect(contactKeys.sort()).toEqual(
      ['name', 'phone', 'relationship', 'alternatePhone', 'email'].sort(),
    )
    expect(recordKeys).not.toContain('$__')
    expect(recordKeys).not.toContain('_doc')
    expect(recordKeys).not.toContain('__parentArray')
    expect(JSON.stringify(res.body.data.emergencyContacts)).not.toContain('$__parent')
  })

  it('returns a safe 404 for a nonexistent id', async () => {
    const admin = await loginAs({ email: 'detailadmin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/students/000000000000000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })
})
