import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { BatchModel } from '../../src/models/batch.model'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

setupTransactionalTestDatabase()

async function createConfirmedEnrollment(accessToken: string, maxStudents = 5) {
  const course = await createPublishedCourseFixture()
  const batch = await createBatchFixture(course._id.toString(), { maxStudents })
  const student = await createStudentFixture()
  const res = await request(app)
    .post('/api/v1/enrollments')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ studentId: student._id.toString(), batchId: batch._id.toString() })
  return { enrollmentId: res.body.data.id as string, batchId: batch._id.toString() }
}

async function auditActions(accessToken: string, id: string) {
  const res = await request(app)
    .get(`/api/v1/enrollments/${id}/audit`)
    .set('Authorization', `Bearer ${accessToken}`)
  return (res.body.data as { action: string }[]).map((entry) => entry.action)
}

describe('Enrollment lifecycle', () => {
  it('activates a CONFIRMED enrollment (ACTIVE) and sets accessStartsAt, without changing the seat count', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ACTIVE')
    expect(res.body.data.accessStartsAt).not.toBeNull()

    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(1)
    expect(await auditActions(admin.accessToken, enrollmentId)).toContain('enrollment.activated')
  })

  it('suspends an ACTIVE enrollment, retaining the seat and denying access', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken)
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('SUSPENDED')

    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(1)
  })

  it('resumes a SUSPENDED enrollment back to ACTIVE without a new seat reservation', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken, 1)
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/resume`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ACTIVE')
    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(1)
  })

  it('completes an ACTIVE enrollment, releasing the seat, and retains lifetime access (accessEndsAt stays null)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken)
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
    expect(res.body.data.accessEndsAt).toBeNull()

    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(0)
  })

  it('cancels a CONFIRMED (seat-consuming) enrollment, releasing the seat and revoking access immediately', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Requested by student' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(res.body.data.accessEndsAt).not.toBeNull()

    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(0)
  })

  it('drops an ACTIVE enrollment, releasing the seat', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const { enrollmentId, batchId } = await createConfirmedEnrollment(admin.accessToken)
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/drop`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Left the program' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DROPPED')

    const batch = await BatchModel.findById(batchId)
    expect(batch?.occupiedSeats).toBe(0)
  })

  it('rejects an illegal transition (CONFIRMED -> COMPLETED, skipping ACTIVE)', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const { enrollmentId } = await createConfirmedEnrollment(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(409)
  })

  it('rejects any transition out of a terminal status (CANCELLED -> ACTIVE)', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const { enrollmentId } = await createConfirmedEnrollment(admin.accessToken)
    await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({})

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(409)
  })

  it('rejects confirming a CONFIRMED enrollment a second time (not PENDING)', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const { enrollmentId } = await createConfirmedEnrollment(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/enrollments/${enrollmentId}/confirm`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()

    expect(res.status).toBe(409)
  })

  it('returns 404 for a nonexistent enrollment id on a lifecycle action', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const res = await request(app)
      .post('/api/v1/enrollments/000000000000000000000000/activate')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send()
    expect(res.status).toBe(404)
  })
})
