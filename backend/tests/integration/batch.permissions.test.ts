import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture, validCreateBatchPayload } from '../helpers/batch-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function loginAllRoles(suffix: string) {
  const admin = await loginAs({ email: `admin-${suffix}@example.com`, role: 'ADMIN' })
  const superAdmin = await loginAs({
    email: `superadmin-${suffix}@example.com`,
    role: 'SUPER_ADMIN',
  })
  const trainer = await loginAs({ email: `trainer-${suffix}@example.com`, role: 'TRAINER' })
  const student = await loginAs({ email: `student-${suffix}@example.com`, role: 'STUDENT' })
  return { admin, superAdmin, trainer, student }
}

describe('permissions matrix', () => {
  it('POST /batches (create): ADMIN + SUPER_ADMIN allowed; TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('create')
    const course = await createPublishedCourseFixture()
    const payload = validCreateBatchPayload(course._id.toString())

    const adminRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)
    expect(adminRes.status).toBe(201)

    const superAdminRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(payload)
    expect(superAdminRes.status).toBe(201)

    const trainerRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send(payload)
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(payload)
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).post('/api/v1/batches').send(payload)
    expect(anonRes.status).toBe(401)
  })

  it('GET /batches (list): ADMIN + SUPER_ADMIN allowed; TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('list')

    const adminRes = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(adminRes.status).toBe(200)

    const superAdminRes = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(superAdminRes.status).toBe(200)

    const trainerRes = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .get('/api/v1/batches')
      .set('Authorization', `Bearer ${student.accessToken}`)
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).get('/api/v1/batches')
    expect(anonRes.status).toBe(401)
  })

  it('PATCH /batches/:id (update): ADMIN + SUPER_ADMIN allowed; TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('update')
    const course = await createPublishedCourseFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))
    const id = created.body.data.id as string

    const adminRes = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ shortName: 'A' })
    expect(adminRes.status).toBe(200)

    const superAdminRes = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({ shortName: 'B' })
    expect(superAdminRes.status).toBe(200)

    const trainerRes = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({ shortName: 'C' })
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .patch(`/api/v1/batches/${id}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ shortName: 'D' })
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).patch(`/api/v1/batches/${id}`).send({ shortName: 'E' })
    expect(anonRes.status).toBe(401)
  })

  it('POST /batches/:id/lifecycle/schedule: ADMIN + SUPER_ADMIN allowed (permission passes through to business logic); TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('lifecycle')
    const course = await createPublishedCourseFixture()
    const created = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateBatchPayload(course._id.toString()))
    const id = created.body.data.id as string

    // A bare (not-ready) DRAFT batch: the permission-allowed roles reach the
    // business logic and get a 422 (not ready) rather than a 403 — proving
    // the permission gate itself let them through, without needing separate
    // fully-ready fixtures per role (and without mutating batch state, since
    // a failed schedule attempt never transitions the batch).
    const adminRes = await request(app)
      .post(`/api/v1/batches/${id}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(adminRes.status).toBe(422)

    const superAdminRes = await request(app)
      .post(`/api/v1/batches/${id}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(superAdminRes.status).toBe(422)

    const trainerRes = await request(app)
      .post(`/api/v1/batches/${id}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${trainer.accessToken}`)
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .post(`/api/v1/batches/${id}/lifecycle/schedule`)
      .set('Authorization', `Bearer ${student.accessToken}`)
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).post(`/api/v1/batches/${id}/lifecycle/schedule`)
    expect(anonRes.status).toBe(401)
  })

  it('GET /batches/export: ADMIN + SUPER_ADMIN allowed; TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('export')

    const adminRes = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(adminRes.status).toBe(200)

    const superAdminRes = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
    expect(superAdminRes.status).toBe(200)

    const trainerRes = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .get('/api/v1/batches/export')
      .set('Authorization', `Bearer ${student.accessToken}`)
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).get('/api/v1/batches/export')
    expect(anonRes.status).toBe(401)
  })

  it('POST /batches/bulk/archive: ADMIN + SUPER_ADMIN allowed; TRAINER, STUDENT, and unauthenticated denied', async () => {
    const { admin, superAdmin, trainer, student } = await loginAllRoles('bulk')
    const body = { action: 'archive', batchIds: ['000000000000000000000000'] }

    const adminRes = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(body)
    expect(adminRes.status).toBe(200)

    const superAdminRes = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(body)
    expect(superAdminRes.status).toBe(200)

    const trainerRes = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send(body)
    expect(trainerRes.status).toBe(403)

    const studentRes = await request(app)
      .post('/api/v1/batches/bulk/archive')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(body)
    expect(studentRes.status).toBe(403)

    const anonRes = await request(app).post('/api/v1/batches/bulk/archive').send(body)
    expect(anonRes.status).toBe(401)
  })
})
