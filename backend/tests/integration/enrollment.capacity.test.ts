import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { BatchModel } from '../../src/models/batch.model'
import { EnrollmentModel } from '../../src/models/enrollment.model'
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

describe('Capacity engine', () => {
  it('increments batch.occupiedSeats atomically on a CONFIRMED enrollment', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 3 })
    const student = await createStudentFixture()

    await enroll(admin.accessToken, student._id.toString(), batch._id.toString())

    const reloaded = await BatchModel.findById(batch._id)
    expect(reloaded?.occupiedSeats).toBe(1)
  })

  it('rejects enrollment once the batch is full and waitlist is disabled', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: false,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    const firstRes = await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    expect(firstRes.status).toBe(201)

    const secondRes = await enroll(admin.accessToken, second._id.toString(), batch._id.toString())
    expect(secondRes.status).toBe(409)
  })

  it('waitlists instead of rejecting once full when the batch allows a waitlist, and does not consume a seat', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    const secondRes = await enroll(admin.accessToken, second._id.toString(), batch._id.toString())

    expect(secondRes.status).toBe(201)
    expect(secondRes.body.data.status).toBe('WAITLISTED')
    expect(secondRes.body.data.waitlistPosition).toBe(1)

    const reloaded = await BatchModel.findById(batch._id)
    expect(reloaded?.occupiedSeats).toBe(1)
  })

  it('never oversubscribes under two concurrent requests for the last seat (no naive count-then-insert race)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    const [resA, resB] = await Promise.all([
      enroll(admin.accessToken, first._id.toString(), batch._id.toString()),
      enroll(admin.accessToken, second._id.toString(), batch._id.toString()),
    ])

    const statuses = [resA.body.data.status, resB.body.data.status].sort()
    expect(statuses).toEqual(['CONFIRMED', 'WAITLISTED'])

    const reloaded = await BatchModel.findById(batch._id)
    expect(reloaded?.occupiedSeats).toBe(1)

    const confirmedCount = await EnrollmentModel.countDocuments({
      batchId: batch._id,
      status: 'CONFIRMED',
    })
    expect(confirmedCount).toBe(1)
  })

  it('promotes a WAITLISTED enrollment to CONFIRMED once a seat frees up', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    const firstRes = await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    const secondRes = await enroll(admin.accessToken, second._id.toString(), batch._id.toString())
    expect(secondRes.body.data.status).toBe('WAITLISTED')

    await request(app)
      .post(`/api/v1/enrollments/${String(firstRes.body.data.id)}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({})

    const promoted = await request(app)
      .post(`/api/v1/enrollments/${String(secondRes.body.data.id)}/promote-waitlist`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(promoted.status).toBe(200)
    expect(promoted.body.data.status).toBe('CONFIRMED')
  })

  it('rejects promoting a WAITLISTED enrollment when no seat is actually free', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    const secondRes = await enroll(admin.accessToken, second._id.toString(), batch._id.toString())

    const promoted = await request(app)
      .post(`/api/v1/enrollments/${String(secondRes.body.data.id)}/promote-waitlist`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(promoted.status).toBe(409)
  })

  it('GET /batches/:id/capacity reports maxStudents/occupiedSeats/availableSeats/waitlistCount, never a fraction the client controls', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 2,
      waitlistEnabled: true,
    })
    const first = await createStudentFixture()
    const second = await createStudentFixture()
    const third = await createStudentFixture()

    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    await enroll(admin.accessToken, second._id.toString(), batch._id.toString())
    await enroll(admin.accessToken, third._id.toString(), batch._id.toString())

    const res = await request(app)
      .get(`/api/v1/batches/${String(batch._id)}/capacity`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      maxStudents: 2,
      occupiedSeats: 2,
      availableSeats: 0,
      waitlistCount: 1,
    })
  })

  it('GET /batches/:id/waitlist lists the queue oldest-first with a stable position', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: true,
    })
    const filler = await createStudentFixture()
    const first = await createStudentFixture()
    const second = await createStudentFixture()

    await enroll(admin.accessToken, filler._id.toString(), batch._id.toString())
    await enroll(admin.accessToken, first._id.toString(), batch._id.toString())
    await enroll(admin.accessToken, second._id.toString(), batch._id.toString())

    const res = await request(app)
      .get(`/api/v1/batches/${String(batch._id)}/waitlist`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].waitlistPosition).toBe(1)
    expect(res.body.data[1].waitlistPosition).toBe(2)
  })

  it('SUPER_ADMIN-only capacity reconcile corrects a drifted occupiedSeats counter and audits the correction', async () => {
    const superAdmin = await loginAs({ email: 'superadmin1@example.com', role: 'SUPER_ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()
    await enroll(superAdmin.accessToken, student._id.toString(), batch._id.toString())

    // Simulate drift — a direct DB edit bypassing the service layer.
    await BatchModel.findByIdAndUpdate(batch._id, { occupiedSeats: 4 })

    const res = await request(app)
      .post(`/api/v1/batches/${String(batch._id)}/capacity/reconcile`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ before: 4, after: 1, corrected: true })
  })

  it('denies an ADMIN (not SUPER_ADMIN) from the capacity reconcile endpoint', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())

    const res = await request(app)
      .post(`/api/v1/batches/${String(batch._id)}/capacity/reconcile`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(403)
  })
})
