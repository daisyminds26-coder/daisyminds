import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

setupTransactionalTestDatabase()

async function enroll(accessToken: string, studentId: string, batchId: string) {
  return request(app)
    .post('/api/v1/enrollments')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ studentId, batchId })
}

describe('Part 2: real batch capacity in DTOs', () => {
  it('GET /batches/:id includes occupiedSeats/availableSeats derived from real enrollments', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 3 })
    const student = await createStudentFixture()
    await enroll(admin.accessToken, student._id.toString(), batch._id.toString())

    const res = await request(app)
      .get(`/api/v1/batches/${String(batch._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.occupiedSeats).toBe(1)
    expect(res.body.data.availableSeats).toBe(2)
  })

  it('GET /batches (list) includes occupiedSeats/availableSeats per row', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 2 })
    const student = await createStudentFixture()
    await enroll(admin.accessToken, student._id.toString(), batch._id.toString())

    const res = await request(app)
      .get(`/api/v1/batches?search=${batch.name}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data[0].occupiedSeats).toBe(1)
    expect(res.body.data[0].availableSeats).toBe(1)
  })

  it('rejects lowering maxStudents below the seats already occupied', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 3 })
    const first = await createStudentFixture()
    const second = await createStudentFixture()
    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    await enroll(admin.accessToken, second._id.toString(), batch._id.toString())

    const res = await request(app)
      .patch(`/api/v1/batches/${String(batch._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ maxStudents: 1 })

    expect(res.status).toBe(409)
  })

  it('allows setting maxStudents exactly equal to occupiedSeats', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()
    await enroll(admin.accessToken, student._id.toString(), batch._id.toString())

    const res = await request(app)
      .patch(`/api/v1/batches/${String(batch._id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ maxStudents: 1 })

    expect(res.status).toBe(200)
    expect(res.body.data.maxStudents).toBe(1)
  })
})

describe('Part 2: derived accessState on enrollment DTOs', () => {
  it('reports ACTIVE for an ACTIVE enrollment', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()
    const created = await enroll(admin.accessToken, student._id.toString(), batch._id.toString())
    await request(app)
      .post(`/api/v1/enrollments/${String(created.body.data.id)}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .get(`/api/v1/enrollments/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.accessState).toBe('ACTIVE')
  })

  it('reports SUSPENDED for a SUSPENDED enrollment (never re-derives from dates)', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()
    const created = await enroll(admin.accessToken, student._id.toString(), batch._id.toString())
    const id = created.body.data.id as string
    await request(app)
      .post(`/api/v1/enrollments/${id}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()
    await request(app)
      .post(`/api/v1/enrollments/${id}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .get(`/api/v1/enrollments/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.accessState).toBe('SUSPENDED')
  })

  it('reports LIFETIME for a COMPLETED enrollment with an open access window', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()
    const created = await enroll(admin.accessToken, student._id.toString(), batch._id.toString())
    const id = created.body.data.id as string
    await request(app)
      .post(`/api/v1/enrollments/${id}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()
    await request(app)
      .post(`/api/v1/enrollments/${id}/complete`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .get(`/api/v1/enrollments/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.accessState).toBe('LIFETIME')
  })

  it('reports NONE for a WAITLISTED enrollment, and surfaces the same field on the list endpoint', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()
    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    const created = await enroll(admin.accessToken, second._id.toString(), batch._id.toString())
    expect(created.body.data.status).toBe('WAITLISTED')
    expect(created.body.data.accessState).toBe('NONE')

    const listRes = await request(app)
      .get(`/api/v1/enrollments?batchId=${String(batch._id)}&status=WAITLISTED`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(listRes.body.data[0].accessState).toBe('NONE')
  })
})
