import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { ensureTestRole } from '../helpers/seed'
import { validCreateStudentPayload } from '../helpers/student-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

beforeEach(async () => {
  await ensureTestRole('STUDENT', [])
})

async function createStudent(
  accessToken: string,
  overrides: Parameters<typeof validCreateStudentPayload>[0] = {},
) {
  const res = await request(app)
    .post('/api/v1/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateStudentPayload(overrides))
  return res.body.data as { id: string; studentId: string; profileCompletionPercentage: number }
}

describe('PATCH /api/v1/students/:id', () => {
  it('updates permitted profile fields and recalculates profile completion', async () => {
    const admin = await loginAs({ email: 'update-admin@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'update1@example.com' })
    expect(student.profileCompletionPercentage).toBe(40)

    const res = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        gender: 'FEMALE',
        educationRecords: [
          { degree: 'B.Sc', institution: 'Delhi University', yearOfCompletion: 2023 },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.gender).toBe('FEMALE')
    expect(res.body.data.educationRecords).toHaveLength(1)
    expect(res.body.data.profileCompletionPercentage).toBe(80)
    expect(res.body.data.profileCompletionStatus).toBe('PARTIAL')
  })

  it('leaves fields not present in the request unchanged (true partial update)', async () => {
    const admin = await loginAs({ email: 'update-admin2@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, {
      email: 'update2@example.com',
      firstName: 'Original',
    })

    const res = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ notes: 'A short note' })

    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Original')
    expect(res.body.data.notes).toBe('A short note')
  })

  it('rejects mass-assignment of email/role/studentId (not part of the update schema)', async () => {
    const admin = await loginAs({ email: 'update-admin3@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'update3@example.com' })

    const res = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'hijacked@example.com', role: 'SUPER_ADMIN', studentId: 'DM-STU-2020-000001' })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid date of birth on update', async () => {
    const admin = await loginAs({ email: 'update-admin4@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'update4@example.com' })

    const res = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ dateOfBirth: new Date(Date.now() + 86_400_000).toISOString() })

    expect(res.status).toBe(400)
  })

  it('rejects clearing emergency contacts to an empty array', async () => {
    const admin = await loginAs({ email: 'update-admin5@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'update5@example.com' })

    const res = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ emergencyContacts: [] })

    expect(res.status).toBe(400)
  })
})

describe('student lifecycle actions', () => {
  it('activates and deactivates a student, revoking sessions on deactivate', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin1@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, {
      email: 'lifecycle1@example.com',
      sendInvitation: false,
    })

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle1@example.com', password: 'correct-horse-1' })
    expect(loginRes.status).toBe(200)

    const deactivateRes = await request(app)
      .post(`/api/v1/students/${student.id}/deactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deactivateRes.status).toBe(200)
    expect(deactivateRes.body.data.status).toBe('DEACTIVATED')

    const refreshRes = await request(app).post('/api/v1/auth/refresh')
    expect(refreshRes.status).toBe(401)

    const activateRes = await request(app)
      .post(`/api/v1/students/${student.id}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(activateRes.status).toBe(200)
    expect(activateRes.body.data.status).toBe('ACTIVE')
  })

  it('soft-deletes a student (linked user only) and restores it', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin2@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'lifecycle2@example.com' })

    const deleteRes = await request(app)
      .delete(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const getDeletedRes = await request(app)
      .get(`/api/v1/students/${student.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(getDeletedRes.status).toBe(200)
    expect(getDeletedRes.body.data.isDeleted).toBe(true)

    const restoreRes = await request(app)
      .post(`/api/v1/students/${student.id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.isDeleted).toBe(false)
  })

  it('rejects restoring a student that is not deleted', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin3@example.com', role: 'ADMIN' })
    const student = await createStudent(admin.accessToken, { email: 'lifecycle3@example.com' })

    const res = await request(app)
      .post(`/api/v1/students/${student.id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })

  it('resends an invitation only while PENDING_VERIFICATION', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin4@example.com', role: 'ADMIN' })
    const pendingStudent = await createStudent(admin.accessToken, { email: 'pending@example.com' })
    const activeStudent = await createStudent(admin.accessToken, {
      email: 'already-active@example.com',
      sendInvitation: false,
    })

    const resendRes = await request(app)
      .post(`/api/v1/students/${pendingStudent.id}/resend-invitation`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(resendRes.status).toBe(200)

    const rejectedRes = await request(app)
      .post(`/api/v1/students/${activeStudent.id}/resend-invitation`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(rejectedRes.status).toBe(422)
  })

  it('returns a safe 404 acting on a nonexistent student', async () => {
    const admin = await loginAs({ email: 'lifecycle-admin5@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/students/000000000000000000000000/activate')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })
})
