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

async function createAndLoginStudent(adminToken: string, email: string) {
  const createRes = await request(app)
    .post('/api/v1/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validCreateStudentPayload({ email, sendInvitation: false }))
  const studentId = createRes.body.data.id as string

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'correct-horse-1' })

  return { studentId, accessToken: loginRes.body.data.accessToken as string }
}

describe('student sessions — SUPER_ADMIN only', () => {
  it('SUPER_ADMIN can list and force-revoke a session', async () => {
    const superAdmin = await loginAs({ email: 'sa1@example.com', role: 'SUPER_ADMIN' })
    const { studentId } = await createAndLoginStudent(
      superAdmin.accessToken,
      'sessions1@example.com',
    )

    const listRes = await request(app)
      .get(`/api/v1/students/${studentId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data).toHaveLength(1)

    const sessionId = listRes.body.data[0].id as string
    const revokeRes = await request(app)
      .delete(`/api/v1/students/${studentId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(revokeRes.status).toBe(200)

    const afterRes = await request(app)
      .get(`/api/v1/students/${studentId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(afterRes.body.data).toHaveLength(0)
  })

  it('SUPER_ADMIN can force-logout every session at once', async () => {
    const superAdmin = await loginAs({ email: 'sa2@example.com', role: 'SUPER_ADMIN' })
    const { studentId } = await createAndLoginStudent(
      superAdmin.accessToken,
      'sessions2@example.com',
    )

    const res = await request(app)
      .post(`/api/v1/students/${studentId}/logout-all`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(res.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/v1/students/${studentId}/sessions`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(listRes.body.data).toHaveLength(0)
  })

  it('an ADMIN is denied session access even though they hold students:manage', async () => {
    const superAdmin = await loginAs({ email: 'sa3@example.com', role: 'SUPER_ADMIN' })
    const admin = await loginAs({ email: 'admin-sessions@example.com', role: 'ADMIN' })
    const { studentId } = await createAndLoginStudent(
      superAdmin.accessToken,
      'sessions3@example.com',
    )

    const res = await request(app)
      .get(`/api/v1/students/${studentId}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/students/:id/audit-log — SUPER_ADMIN only', () => {
  it('records an audit entry for student creation with no sensitive data', async () => {
    const superAdmin = await loginAs({ email: 'sa4@example.com', role: 'SUPER_ADMIN' })

    const createRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'audited@example.com' }))
    const studentId = createRes.body.data.id as string

    const res = await request(app)
      .get(`/api/v1/students/${studentId}/audit-log`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(res.status).toBe(200)
    const createdEntry = res.body.data.find(
      (entry: { action: string }) => entry.action === 'student.created',
    )
    expect(createdEntry).toBeDefined()
    expect(JSON.stringify(createdEntry)).not.toMatch(/password/i)
    expect(createdEntry.metadata.studentId).toBe(createRes.body.data.studentId)
  })

  it('an ADMIN is denied audit access', async () => {
    const superAdmin = await loginAs({ email: 'sa5@example.com', role: 'SUPER_ADMIN' })
    const admin = await loginAs({ email: 'admin-audit@example.com', role: 'ADMIN' })

    const createRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'audited2@example.com' }))

    const res = await request(app)
      .get(`/api/v1/students/${createRes.body.data.id as string}/audit-log`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(403)
  })
})
