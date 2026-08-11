import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createTestUser, ensureTestRole } from '../helpers/seed'
import { validCreateStudentPayload } from '../helpers/student-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

beforeEach(async () => {
  await ensureTestRole('STUDENT', [])
})

async function createStudent(accessToken: string, email: string) {
  const res = await request(app)
    .post('/api/v1/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateStudentPayload({ email }))
  return res.body.data.id as string
}

describe('POST /api/v1/students/bulk', () => {
  it('bulk-deactivates multiple students', async () => {
    const admin = await loginAs({ email: 'bulk-admin1@example.com', role: 'ADMIN' })
    const id1 = await createStudent(admin.accessToken, 'bulk1@example.com')
    const id2 = await createStudent(admin.accessToken, 'bulk2@example.com')

    const res = await request(app)
      .post('/api/v1/students/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'deactivate', studentIds: [id1, id2] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual(expect.arrayContaining([id1, id2]))
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('reports a per-item failure without aborting the rest of the batch', async () => {
    const admin = await loginAs({ email: 'bulk-admin2@example.com', role: 'ADMIN' })
    const validId = await createStudent(admin.accessToken, 'bulk3@example.com')
    const missingId = '000000000000000000000000'

    const res = await request(app)
      .post('/api/v1/students/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'activate', studentIds: [validId, missingId] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([validId])
    expect(res.body.data.failed).toEqual([{ id: missingId, reason: 'Student not found' }])
  })

  it('bulk soft-deletes then bulk-restores', async () => {
    const admin = await loginAs({ email: 'bulk-admin3@example.com', role: 'ADMIN' })
    const id = await createStudent(admin.accessToken, 'bulk4@example.com')

    const deleteRes = await request(app)
      .post('/api/v1/students/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'delete', studentIds: [id] })
    expect(deleteRes.body.data.succeeded).toEqual([id])

    const restoreRes = await request(app)
      .post('/api/v1/students/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'restore', studentIds: [id] })
    expect(restoreRes.body.data.succeeded).toEqual([id])
  })

  it('rejects a batch larger than 100 ids', async () => {
    const admin = await loginAs({ email: 'bulk-admin4@example.com', role: 'ADMIN' })
    const ids = Array.from({ length: 101 }, () => '000000000000000000000000')

    const res = await request(app)
      .post('/api/v1/students/bulk')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'activate', studentIds: ids })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/students/export', () => {
  it('exports the filtered set as CSV with a safe column header', async () => {
    const admin = await loginAs({ email: 'export-admin1@example.com', role: 'ADMIN' })
    await createStudent(admin.accessToken, 'export1@example.com')

    const res = await request(app)
      .get('/api/v1/students/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.text.split('\r\n')[0]).toBe(
      'studentId,fullName,email,phone,gender,admissionDate,city,state,profileCompletionStatus,accountStatus,isDeleted,createdAt',
    )
    expect(res.text).toContain('export1@example.com')
  })

  it('respects the current filter (city)', async () => {
    const admin = await loginAs({ email: 'export-admin2@example.com', role: 'ADMIN' })
    const payload = validCreateStudentPayload({
      email: 'export-mumbai@example.com',
      address: {
        line1: '1 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)
    await createStudent(admin.accessToken, 'export-bengaluru@example.com')

    const res = await request(app)
      .get('/api/v1/students/export?city=Mumbai')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).toContain('export-mumbai@example.com')
    expect(res.text).not.toContain('export-bengaluru@example.com')
  })

  it('neutralizes a leading formula-trigger character (CSV/formula injection)', async () => {
    const admin = await loginAs({ email: 'export-admin3@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'formula@example.com', firstName: '=cmd|/c calc' }))

    const res = await request(app)
      .get('/api/v1/students/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).not.toMatch(/,=cmd/)
    expect(res.text).toContain("'=cmd|/c calc")
  })

  it('denies export to a role without students:export', async () => {
    // Reuses the STUDENT role already seeded by this file's top-level
    // `beforeEach` — see student.crud.test.ts for why `loginAs` isn't used
    // here directly (it would try to create a second "STUDENT" role).
    const studentRole = await ensureTestRole('STUDENT', [])
    await createTestUser({
      email: 'export-denied@example.com',
      password: 'correct-horse-1',
      roleId: studentRole._id.toString(),
    })
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'export-denied@example.com', password: 'correct-horse-1' })

    const res = await request(app)
      .get('/api/v1/students/export')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken as string}`)

    expect(res.status).toBe(403)
  })
})
