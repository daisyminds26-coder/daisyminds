import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { StudentModel } from '../../src/models/student.model'
import { RoleModel } from '../../src/models/role.model'
import { loginAs } from '../helpers/auth'
import { createTestUser, ensureTestRole } from '../helpers/seed'
import { readyToPublishCoursePayload } from '../helpers/course-fixtures'
import { validCreateStudentPayload } from '../helpers/student-fixtures'
import { validCreateTrainerPayload } from '../helpers/trainer-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

const { apiSignRequest, apiResource, uploaderDestroy } = vi.hoisted(() => ({
  apiSignRequest: vi.fn().mockReturnValue('fake-signature'),
  apiResource: vi.fn(),
  uploaderDestroy: vi.fn().mockResolvedValue({ result: 'ok' }),
}))

vi.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    utils: { api_sign_request: apiSignRequest },
    api: { resource: apiResource },
    uploader: { destroy: uploaderDestroy },
  },
}))

setupTestDatabase()

const AN_OLD_DATE = new Date('2000-01-01T00:00:00.000Z')

beforeEach(async () => {
  await ensureTestRole('STUDENT', [])
  await ensureTestRole('TRAINER', [])
  apiResource.mockReset()
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
    resource_type: 'image',
  })
})

async function getDashboard(token: string, query = '') {
  return request(app).get(`/api/v1/dashboard/admin${query}`).set('Authorization', `Bearer ${token}`)
}

describe('GET /api/v1/dashboard/admin — summary and distributions', () => {
  it('counts an active student and reports it as newStudents within the default period', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu1@example.com', sendInvitation: false }))

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.summary.activeStudents).toBe(1)
    expect(res.body.data.summary.newStudents).toBe(1)
  })

  it('excludes a student created outside the selected period from newStudents but still counts it as active', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu2@example.com', sendInvitation: false }))

    const student = await StudentModel.findOne({})
    await StudentModel.collection.updateOne(
      { _id: student?._id },
      { $set: { createdAt: AN_OLD_DATE } },
    )

    const res = await getDashboard(admin.accessToken, '?range=TODAY')

    expect(res.status).toBe(200)
    expect(res.body.data.summary.activeStudents).toBe(1)
    expect(res.body.data.summary.newStudents).toBe(0)
  })

  it('counts an active trainer', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'trn1@example.com', sendInvitation: false }))

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.summary.activeTrainers).toBe(1)
    expect(res.body.data.summary.newTrainers).toBe(1)
  })

  it('excludes a soft-deleted (deactivated user) student from activeStudents', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu3@example.com', sendInvitation: false }))

    await request(app)
      .delete(`/api/v1/students/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.summary.activeStudents).toBe(0)
  })

  it('reports pendingVerificationAccounts, lockedAccounts, and suspendedAccounts across all user roles', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const role = await RoleModel.findOne({ name: 'STUDENT' })
    await createTestUser({
      email: 'pending@example.com',
      password: 'correct-horse-1',
      roleId: String(role?._id),
      status: 'PENDING_VERIFICATION',
    })
    await createTestUser({
      email: 'locked@example.com',
      password: 'correct-horse-1',
      roleId: String(role?._id),
      status: 'LOCKED',
    })
    await createTestUser({
      email: 'suspended@example.com',
      password: 'correct-horse-1',
      roleId: String(role?._id),
      status: 'SUSPENDED',
    })

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.summary.pendingVerificationAccounts).toBeGreaterThanOrEqual(1)
    expect(res.body.data.summary.lockedAccounts).toBe(1)
    expect(res.body.data.summary.suspendedAccounts).toBe(1)
  })

  it('reports the user-status distribution as an array of {key, count}', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    const distribution = res.body.data.distributions.userStatus as { key: string; count: number }[]
    expect(Array.isArray(distribution)).toBe(true)
    expect(
      distribution.every((row) => typeof row.key === 'string' && typeof row.count === 'number'),
    ).toBe(true)
  })

  it('reports the student and trainer profile-completion distributions', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu4@example.com', sendInvitation: false }))
    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'trn2@example.com', sendInvitation: false }))

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    const studentDist = res.body.data.distributions.studentProfileCompletion as {
      key: string
      count: number
    }[]
    const trainerDist = res.body.data.distributions.trainerProfileCompletion as {
      key: string
      count: number
    }[]
    // The exact bucket (INCOMPLETE/PARTIAL/COMPLETE) depends on how much of
    // the fixture payload the profile-completion calculation credits — this
    // asserts the distribution/summary agree with each other and account
    // for the one created record, not a specific bucket name.
    const studentTotal = studentDist.reduce((sum, row) => sum + row.count, 0)
    const trainerTotal = trainerDist.reduce((sum, row) => sum + row.count, 0)
    expect(studentTotal).toBe(1)
    expect(trainerTotal).toBe(1)
    expect(res.body.data.summary.incompleteStudentProfiles).toBe(
      studentDist.find((row) => row.key === 'INCOMPLETE')?.count ?? 0,
    )
    expect(res.body.data.summary.incompleteTrainerProfiles).toBe(
      trainerDist.find((row) => row.key === 'INCOMPLETE')?.count ?? 0,
    )
  })

  it('counts only published, non-deleted courses in publishedCourses', async () => {
    const admin = await loginAs({ email: 'admin15@example.com', role: 'ADMIN' })

    const draft = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToPublishCoursePayload({ title: 'Draft Course' }))

    const published = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(readyToPublishCoursePayload({ title: 'Published Course' }))
    const publishedId = String(published.body.data.id)

    const sigRes = await request(app)
      .post(`/api/v1/courses/${publishedId}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${publishedId}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })
    await request(app)
      .post(`/api/v1/courses/${publishedId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(draft.status).toBe(201)

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.summary.publishedCourses).toBe(1)
  })
})

describe('GET /api/v1/dashboard/admin — recent records', () => {
  it('returns recent students limited to 5, sorted newest first', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    for (let i = 0; i < 7; i += 1) {
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          validCreateStudentPayload({
            email: `bulk-stu-${String(i)}@example.com`,
            sendInvitation: false,
          }),
        )
    }

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.recentStudents).toHaveLength(5)
    const createdAts = (res.body.data.recentStudents as { createdAt: string }[]).map((row) =>
      new Date(row.createdAt).getTime(),
    )
    expect([...createdAts].sort((a, b) => b - a)).toEqual(createdAts)
  })

  it('returns recent trainers with a safe, non-sensitive shape', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'trn3@example.com', sendInvitation: false }))

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    const [trainer] = res.body.data.recentTrainers as Record<string, unknown>[]
    expect(trainer).toMatchObject({ name: 'Arjun Mehta', email: 'trn3@example.com' })
    expect(trainer?.passwordHash).toBeUndefined()
  })

  it('excludes a deleted trainer from recentTrainers', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateTrainerPayload({ email: 'trn4@example.com', sendInvitation: false }))
    await request(app)
      .delete(`/api/v1/trainers/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    expect(res.body.data.recentTrainers).toHaveLength(0)
  })
})

describe('GET /api/v1/dashboard/admin — alerts', () => {
  it('raises a NO_STUDENTS and NO_TRAINERS alert with an allowlisted route when neither exists yet', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })

    const res = await getDashboard(admin.accessToken)

    expect(res.status).toBe(200)
    const alerts = res.body.data.alerts as { type: string; actionRoute: string }[]
    expect(alerts.find((alert) => alert.type === 'NO_STUDENTS')?.actionRoute).toBe(
      '/admin/students',
    )
    expect(alerts.find((alert) => alert.type === 'NO_TRAINERS')?.actionRoute).toBe(
      '/admin/trainers',
    )
  })

  it('does not raise NO_STUDENTS once a student exists', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu5@example.com', sendInvitation: false }))

    const res = await getDashboard(admin.accessToken)

    const alerts = res.body.data.alerts as { type: string }[]
    expect(alerts.some((alert) => alert.type === 'NO_STUDENTS')).toBe(false)
  })

  it('raises a LOCKED_ACCOUNTS alert once a locked account exists, pointing at the allowlisted users route', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    const role = await RoleModel.findOne({ name: 'STUDENT' })
    await createTestUser({
      email: 'locked2@example.com',
      password: 'correct-horse-1',
      roleId: String(role?._id),
      status: 'LOCKED',
    })

    const res = await getDashboard(admin.accessToken)

    const alerts = res.body.data.alerts as { type: string; actionRoute: string; severity: string }[]
    const alert = alerts.find((entry) => entry.type === 'LOCKED_ACCOUNTS')
    expect(alert?.actionRoute).toBe('/admin/users?status=LOCKED')
    expect(alert?.severity).toBe('warning')
  })
})

describe('GET /api/v1/dashboard/admin — timezone-aware period boundaries', () => {
  it('reports the requested timezone back in the period, and computes distinct start/end for LAST_7_DAYS vs LAST_30_DAYS', async () => {
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })

    const sevenDay = await getDashboard(
      admin.accessToken,
      '?range=LAST_7_DAYS&timezone=Asia/Kolkata',
    )
    const thirtyDay = await getDashboard(
      admin.accessToken,
      '?range=LAST_30_DAYS&timezone=Asia/Kolkata',
    )

    expect(sevenDay.body.data.period.timezone).toBe('Asia/Kolkata')
    expect(new Date(sevenDay.body.data.period.startDate).getTime()).toBeGreaterThan(
      new Date(thirtyDay.body.data.period.startDate).getTime(),
    )
  })
})
