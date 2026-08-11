import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { TrainerModel } from '../../src/models/trainer.model'
import { UserModel } from '../../src/models/user.model'
import { loginAs, type LoggedInActor } from '../helpers/auth'
import { createTestUser, ensureTestRole } from '../helpers/seed'
import { validCreateTrainerPayload } from '../helpers/trainer-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

/** Every `POST /trainers` call resolves the TRAINER role server-side — it must already exist. */
beforeEach(async () => {
  await ensureTestRole('TRAINER', [])
})

describe('POST /api/v1/trainers', () => {
  it('creates a linked user (role TRAINER) and trainer profile in one call', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'arjun@example.com' }))

    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('arjun@example.com')
    expect(res.body.data.status).toBe('PENDING_VERIFICATION')
    expect(res.body.data.trainerId).toMatch(/^DM-TRN-\d{4}-\d{6}$/)
    expect(res.body.data.profileCompletionStatus).toBe('INCOMPLETE')

    const user = await UserModel.findOne({ email: 'arjun@example.com' })
    const trainer = await TrainerModel.findOne({ userId: user?._id })
    expect(trainer?.firstName).toBe('Arjun')
    expect(trainer?.userId.toString()).toBe(user?._id.toString())
  })

  it('creates as ACTIVE immediately when sendInvitation is false', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({ email: 'active-trainer@example.com', sendInvitation: false }),
      )

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('ACTIVE')
    expect(res.body.data.emailVerifiedAt).not.toBeNull()
  })

  it('generates sequential, unique trainerIds under concurrent creation', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app)
          .post('/api/v1/trainers')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send(validCreateTrainerPayload({ email: `concurrent${String(index)}@example.com` })),
      ),
    )

    const trainerIds = responses.map((res) => res.body.data.trainerId as string)
    expect(new Set(trainerIds).size).toBe(5)
  })

  it('rejects a duplicate email', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const payload = validCreateTrainerPayload({ email: 'dupe-trainer@example.com' })

    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)

    expect(res.status).toBe(409)

    const users = await UserModel.find({ email: 'dupe-trainer@example.com' })
    expect(users).toHaveLength(1)
  })

  it('rejects a weak password', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'weak@example.com', password: 'short' }))

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a date of birth in the future', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const futureDate = new Date(Date.now() + 365 * 86_400_000)

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'future-dob@example.com', dateOfBirth: futureDate }))

    expect(res.status).toBe(400)
  })

  it('rejects an invalid LinkedIn URL protocol', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({
          email: 'badurl@example.com',
          linkedinUrl: 'javascript:alert(1)',
        }),
      )

    expect(res.status).toBe(400)
  })

  it('accepts empty strings for optional phone/URL fields as "not provided"', async () => {
    const admin = await loginAs({ email: 'admin7b@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({
          email: 'blank-optionals@example.com',
          alternatePhone: '',
          linkedinUrl: '',
          portfolioUrl: '',
          githubUrl: '',
          websiteUrl: '',
        }),
      )

    expect(res.status).toBe(201)
    expect(res.body.data.alternatePhone).toBeFalsy()
    expect(res.body.data.linkedinUrl).toBeFalsy()
  })

  it('rejects mass-assignment of role/trainerId/security fields', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        ...validCreateTrainerPayload({ email: 'sneaky@example.com' }),
        role: 'SUPER_ADMIN',
        trainerId: 'DM-TRN-2020-000001',
        passwordHash: 'not-a-real-hash',
      })

    expect(res.status).toBe(400)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/trainers').send(validCreateTrainerPayload())
    expect(res.status).toBe(401)
  })

  it('denies a STUDENT (no trainers:manage permission)', async () => {
    const student = await loginAs({ email: 'plain-student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'blocked@example.com' }))

    expect(res.status).toBe(403)
  })

  it('denies a TRAINER (no admin trainer-management access this phase)', async () => {
    // The TRAINER role already exists (seeded by this file's top-level
    // `beforeEach`) — reuse it via `createTestUser` + direct login rather
    // than `loginAs`, which would try to create a second "TRAINER" role and
    // violate the unique index on `roles.name`.
    const trainerRole = await ensureTestRole('TRAINER', [])
    await createTestUser({
      email: 'plain-trainer@example.com',
      password: 'correct-horse-1',
      roleId: trainerRole._id.toString(),
    })
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'plain-trainer@example.com', password: 'correct-horse-1' })

    const res = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken as string}`)
      .send(validCreateTrainerPayload({ email: 'blocked2@example.com' }))

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/trainers', () => {
  let admin: LoggedInActor

  beforeEach(async () => {
    admin = await loginAs({ email: 'listadmin@example.com', role: 'ADMIN' })

    for (let index = 0; index < 3; index += 1) {
      await request(app)
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          validCreateTrainerPayload({
            email: `listtrainer${String(index)}@example.com`,
            firstName: `Trainer${String(index)}`,
            department: index === 0 ? 'Engineering' : 'Design',
            expertiseAreas: index === 0 ? ['React'] : ['Figma'],
          }),
        )
    }
  })

  it('lists trainers with pagination meta, joined email/status', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 })
    expect(res.body.data[0]).toHaveProperty('email')
    expect(res.body.data[0]).toHaveProperty('status')
  })

  it('searches by first name', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?search=Trainer1')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].firstName).toBe('Trainer1')
  })

  it('searches by email prefix', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?search=listtrainer0')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('searches by trainerId', async () => {
    const listRes = await request(app)
      .get('/api/v1/trainers?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const trainerId = listRes.body.data[0].trainerId as string

    const res = await request(app)
      .get(`/api/v1/trainers?search=${trainerId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.some((row: { trainerId: string }) => row.trainerId === trainerId)).toBe(
      true,
    )
  })

  it('searches by expertise', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?search=Figma')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('filters by department', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?department=Engineering')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('filters by account status', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?status=PENDING_VERIFICATION')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  it('sorts by firstName ascending', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?sort=firstName:asc&limit=10')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const names = (res.body.data as { firstName: string }[]).map((row) => row.firstName)
    expect(names).toEqual([...names].sort())
  })

  it('rejects an invalid sort field', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?sort=notAField:asc')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('enforces the maximum page size', async () => {
    const res = await request(app)
      .get('/api/v1/trainers?limit=101')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('excludes soft-deleted trainers by default', async () => {
    const listRes = await request(app)
      .get('/api/v1/trainers?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const target = listRes.body.data[0]

    await request(app)
      .delete(`/api/v1/trainers/${target.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.some((row: { id: string }) => row.id === target.id)).toBe(false)

    const includeDeletedRes = await request(app)
      .get('/api/v1/trainers?includeDeleted=true')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(includeDeletedRes.body.data.some((row: { id: string }) => row.id === target.id)).toBe(
      true,
    )
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/trainers')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/trainers/:id', () => {
  it('returns a single trainer with full profile detail', async () => {
    const admin = await loginAs({ email: 'detailadmin@example.com', role: 'ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({
          email: 'detail@example.com',
          emergencyContacts: [
            { name: 'Contact', phone: '+91 90000 00000', relationship: 'Spouse' },
          ],
        }),
      )

    const res = await request(app)
      .get(`/api/v1/trainers/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('detail@example.com')
    expect(res.body.data.emergencyContacts).toHaveLength(1)
  })

  it('returns a safe 404 for a nonexistent id', async () => {
    const admin = await loginAs({ email: 'detailadmin2@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/trainers/000000000000000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('never leaks raw Mongoose subdocument internals in embedded arrays', async () => {
    const admin = await loginAs({ email: 'noleakadmin@example.com', role: 'ADMIN' })
    const createRes = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateTrainerPayload({
          email: 'noleak@example.com',
          emergencyContacts: [
            { name: 'Contact', phone: '+91 90000 00000', relationship: 'Spouse' },
          ],
          qualifications: [{ degree: 'B.Tech', institution: 'IIT Delhi', yearOfCompletion: 2015 }],
        }),
      )

    const res = await request(app)
      .get(`/api/v1/trainers/${createRes.body.data.id as string}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const contactKeys = Object.keys(res.body.data.emergencyContacts[0])
    expect(contactKeys.sort()).toEqual(
      ['name', 'phone', 'relationship', 'alternatePhone', 'email'].sort(),
    )
    expect(Object.keys(res.body.data.qualifications[0])).not.toContain('$__')
    expect(JSON.stringify(res.body.data.emergencyContacts)).not.toContain('$__parent')
  })
})
