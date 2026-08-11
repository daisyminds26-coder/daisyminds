import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture, createDraftCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

setupTransactionalTestDatabase()

describe('POST /api/v1/enrollments', () => {
  it('creates a CONFIRMED enrollment with a generated DM-ENR-{year}-{6digit} code and derives courseId from the batch', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('CONFIRMED')
    expect(res.body.data.enrollmentCode).toMatch(/^DM-ENR-\d{4}-\d{6}$/)
    expect(res.body.data.courseId).toBe(course._id.toString())
  })

  it('rejects a courseId field in the body (always server-derived from the batch)', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        studentId: student._id.toString(),
        batchId: batch._id.toString(),
        courseId: '000000000000000000000000',
      })

    expect(res.status).toBe(400)
  })

  it('rejects a nonexistent student', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: '000000000000000000000000', batchId: batch._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a nonexistent batch', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const student = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: '000000000000000000000000' })

    expect(res.status).toBe(400)
  })

  it('rejects enrollment into a DRAFT batch (not yet enrollable)', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { status: 'DRAFT' })
    const student = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(409)
  })

  it('rejects enrollment for a SUSPENDED student account', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture({ userStatus: 'SUSPENDED' })

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(400)
  })

  it('allows enrollment for a LOCKED student account (auth lockout is not an enrollment-eligibility signal)', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture({ userStatus: 'LOCKED' })

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(201)
  })

  it('rejects a duplicate non-terminal enrollment for the same student+batch', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()

    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(409)
  })

  it('rejects a second non-terminal enrollment for the same student in a different batch of the same course', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const course = await createPublishedCourseFixture()
    const batchA = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const batchB = await createBatchFixture(course._id.toString(), { maxStudents: 5 })
    const student = await createStudentFixture()

    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batchA._id.toString() })

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batchB._id.toString() })

    expect(res.status).toBe(409)
  })

  it('accepts enrollment into a batch backed by a DRAFT course (batch eligibility, not course publication, gates enrollment)', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const course = await createDraftCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const student = await createStudentFixture()

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentId: student._id.toString(), batchId: batch._id.toString() })

    expect(res.status).toBe(201)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/enrollments').send({})
    expect(res.status).toBe(401)
  })

  it('denies a TRAINER (no enrollment-management access)', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })
    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send({})
    expect(res.status).toBe(403)
  })

  it('denies a STUDENT (no admin enrollment API)', async () => {
    const student = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })
    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({})
    expect(res.status).toBe(403)
  })
})
