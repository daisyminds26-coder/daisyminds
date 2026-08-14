import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { CourseModuleModel } from '../../src/models/course-module.model'
import { LessonModel } from '../../src/models/lesson.model'
import { LessonResourceModel } from '../../src/models/lesson-resource.model'
import { loginAs } from '../helpers/auth'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture, createStudentFixture } from '../helpers/enrollment-fixtures'
import { bearer, createEnrollment, createLoggedInStudent } from '../helpers/student-portal-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('Student portal — self-scoping and entitlement', () => {
  it("GET /student/dashboard returns only the authenticated student's own enrollment data", async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString())

    const res = await request(app).get('/api/v1/student/dashboard').set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.continueLearning.courseId).toBe(course._id.toString())
    expect(res.body.data.courses).toHaveLength(1)
  })

  it('ADMIN is rejected from the STUDENT-only /student router', async () => {
    const admin = await loginAs({ email: 'admin-portal-1@example.com', role: 'ADMIN' })

    const res = await request(app).get('/api/v1/student/dashboard').set(bearer(admin))

    expect(res.status).toBe(403)
  })

  it("a student cannot fetch another student's enrollment by id (404, not 403 — no existence disclosure)", async () => {
    const studentA = await createLoggedInStudent()
    const studentB = await createStudentFixture()
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const othersEnrollment = await createEnrollment(
      studentB._id.toString(),
      course._id.toString(),
      batch._id.toString(),
    )

    const res = await request(app)
      .get(`/api/v1/student/enrollments/${othersEnrollment._id.toString()}`)
      .set(bearer(studentA))

    expect(res.status).toBe(404)
  })

  it('an ACTIVE (entitled) enrollment sees the full published curriculum on the course overview', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const publishedModule = await CourseModuleModel.create({
      courseId: course._id,
      title: 'Module 1',
      order: 0,
      status: 'PUBLISHED',
    })
    await LessonModel.create({
      courseModuleId: publishedModule._id,
      courseId: course._id,
      title: 'Lesson 1',
      order: 0,
      lessonType: 'TEXT',
      status: 'PUBLISHED',
    })

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.hasAccess).toBe(true)
    expect(res.body.data.accessState).toBe('ACTIVE')
    expect(res.body.data.modules).toHaveLength(1)
    expect(res.body.data.modules[0].lessons).toHaveLength(1)
  })

  it('a SUSPENDED enrollment sees the course header (paused-access state) but never the curriculum', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'SUSPENDED',
    })
    const publishedModule = await CourseModuleModel.create({
      courseId: course._id,
      title: 'Module 1',
      order: 0,
      status: 'PUBLISHED',
    })
    await LessonModel.create({
      courseModuleId: publishedModule._id,
      courseId: course._id,
      title: 'Lesson 1',
      order: 0,
      lessonType: 'TEXT',
      status: 'PUBLISHED',
    })

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.hasAccess).toBe(false)
    expect(res.body.data.accessState).toBe('SUSPENDED')
    expect(res.body.data.modules).toHaveLength(0)
  })

  it('a DRAFT module/lesson never appears in the student course overview, even with an ACTIVE enrollment', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const publishedModule = await CourseModuleModel.create({
      courseId: course._id,
      title: 'Published Module',
      order: 0,
      status: 'PUBLISHED',
    })
    await LessonModel.create({
      courseModuleId: publishedModule._id,
      courseId: course._id,
      title: 'Published Lesson',
      order: 0,
      lessonType: 'TEXT',
      status: 'PUBLISHED',
    })
    const draftModule = await CourseModuleModel.create({
      courseId: course._id,
      title: 'Draft Module',
      order: 1,
      status: 'DRAFT',
    })
    await LessonModel.create({
      courseModuleId: draftModule._id,
      courseId: course._id,
      title: 'Draft Lesson',
      order: 0,
      lessonType: 'TEXT',
      status: 'DRAFT',
    })

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    const moduleTitles = (res.body.data.modules as { title: string }[]).map((m) => m.title)
    expect(moduleTitles).toEqual(['Published Module'])
  })

  it('never enrolled in a course at all → 404 on the course overview (no catalog-existence disclosure)', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(404)
  })

  it('resource delivery URL is denied for a course the student is not entitled to', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const module_ = await CourseModuleModel.create({
      courseId: course._id,
      title: 'Module 1',
      order: 0,
      status: 'PUBLISHED',
    })
    const lesson = await LessonModel.create({
      courseModuleId: module_._id,
      courseId: course._id,
      title: 'Lesson 1',
      order: 0,
      lessonType: 'DOCUMENT',
      status: 'PUBLISHED',
    })
    const resource = await LessonResourceModel.create({
      lessonId: lesson._id,
      courseId: course._id,
      title: 'Slides',
      resourceType: 'PDF',
      provider: 'cloudinary',
      publicId: 'fixture/slides',
      assetId: 'fixture-asset-id',
      filename: 'slides.pdf',
      format: 'pdf',
      mimeType: 'application/pdf',
      bytes: 1024,
    })
    // Deliberately no enrollment created for this student/course pair.

    const res = await request(app)
      .get(`/api/v1/student/resources/${resource._id.toString()}/delivery-url`)
      .set(bearer(student))

    expect(res.status).toBe(403)
  })
})
