import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { BatchModel } from '../../src/models/batch.model'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

setupTransactionalTestDatabase()

describe('POST /api/v1/enrollments/:id/transfer', () => {
  it('transfers a CONFIRMED enrollment to another batch of the same course atomically — releases the source seat, reserves the target seat, links both records', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const sourceBatch = await createBatchFixture(course._id.toString(), { maxStudents: 2 })
    const targetBatch = await createBatchFixture(course._id.toString(), { maxStudents: 2 })
    const student = await createStudentFixture()

    const created = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: sourceBatch._id.toString() })
    const sourceId = created.body.data.id as string

    const res = await request(app)
      .post(`/api/v1/enrollments/${sourceId}/transfer`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetBatchId: targetBatch._id.toString() })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CONFIRMED')
    expect(res.body.data.batchId).toBe(targetBatch._id.toString())
    expect(res.body.data.transferredFromEnrollmentId).toBe(sourceId)

    const sourceReloaded = await request(app)
      .get(`/api/v1/enrollments/${sourceId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(sourceReloaded.body.data.status).toBe('DROPPED')
    expect(sourceReloaded.body.data.transferredToEnrollmentId).toBe(res.body.data.id)

    const [reloadedSourceBatch, reloadedTargetBatch] = await Promise.all([
      BatchModel.findById(sourceBatch._id),
      BatchModel.findById(targetBatch._id),
    ])
    expect(reloadedSourceBatch?.occupiedSeats).toBe(0)
    expect(reloadedTargetBatch?.occupiedSeats).toBe(1)
  })

  it('rejects a cross-course transfer', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const courseA = await createPublishedCourseFixture()
    const courseB = await createPublishedCourseFixture()
    const sourceBatch = await createBatchFixture(courseA._id.toString())
    const otherCourseBatch = await createBatchFixture(courseB._id.toString())
    const student = await createStudentFixture()

    const created = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: sourceBatch._id.toString() })

    const res = await request(app)
      .post(`/api/v1/enrollments/${String(created.body.data.id)}/transfer`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetBatchId: otherCourseBatch._id.toString() })

    expect(res.status).toBe(400)
  })

  it('leaves the source enrollment and its seat untouched when the target batch is full and does not accept a waitlist (atomic rollback)', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const sourceBatch = await createBatchFixture(course._id.toString(), { maxStudents: 2 })
    const targetBatch = await createBatchFixture(course._id.toString(), {
      maxStudents: 1,
      waitlistEnabled: false,
    })
    const student = await createStudentFixture()
    const otherStudent = await createStudentFixture()

    // Fill the target batch first.
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: otherStudent._id.toString(), batchId: targetBatch._id.toString() })

    const created = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: sourceBatch._id.toString() })
    const sourceId = created.body.data.id as string

    const res = await request(app)
      .post(`/api/v1/enrollments/${sourceId}/transfer`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetBatchId: targetBatch._id.toString() })

    expect(res.status).toBe(409)

    const sourceReloaded = await request(app)
      .get(`/api/v1/enrollments/${sourceId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(sourceReloaded.body.data.status).toBe('CONFIRMED')

    const reloadedSourceBatch = await BatchModel.findById(sourceBatch._id)
    expect(reloadedSourceBatch?.occupiedSeats).toBe(1)
  })

  it('rejects transferring an enrollment that is not CONFIRMED/ACTIVE/SUSPENDED', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const sourceBatch = await createBatchFixture(course._id.toString())
    const targetBatch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()

    const created = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: sourceBatch._id.toString() })
    const sourceId = created.body.data.id as string
    await request(app)
      .post(`/api/v1/enrollments/${sourceId}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({})

    const res = await request(app)
      .post(`/api/v1/enrollments/${sourceId}/transfer`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetBatchId: targetBatch._id.toString() })

    expect(res.status).toBe(409)
  })
})
