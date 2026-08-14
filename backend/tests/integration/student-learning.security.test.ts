import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { CourseModuleModel } from '../../src/models/course-module.model'
import { LessonModel, type IVideoAsset } from '../../src/models/lesson.model'
import type { ApprovalStatus } from '../../src/models/shared/enums'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createBatchFixture } from '../helpers/enrollment-fixtures'
import { bearer, createEnrollment, createLoggedInStudent } from '../helpers/student-portal-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

function videoAsset(overrides: Partial<IVideoAsset> = {}): IVideoAsset {
  return {
    provider: 'cloudinary',
    publicId: 'fixture/video',
    assetId: 'fixture-asset-id',
    resourceType: 'video',
    format: 'mp4',
    durationSeconds: 100,
    width: null,
    height: null,
    bytes: 1_000_000,
    version: 1,
    status: 'READY',
    uploadedAt: new Date(),
    ...overrides,
  }
}

async function createModule(
  courseId: string,
  overrides: { order?: number; status?: ApprovalStatus } = {},
) {
  return CourseModuleModel.create({
    courseId,
    title: 'Module 1',
    order: overrides.order ?? 0,
    status: overrides.status ?? 'PUBLISHED',
  })
}

async function createVideoLesson(
  courseId: string,
  moduleId: string,
  overrides: {
    order?: number
    status?: ApprovalStatus
    prerequisiteLessonIds?: string[]
    durationSeconds?: number
  } = {},
) {
  return LessonModel.create({
    courseModuleId: moduleId,
    courseId,
    title: 'Video Lesson',
    order: overrides.order ?? 0,
    lessonType: 'VIDEO',
    status: overrides.status ?? 'PUBLISHED',
    isMandatory: true,
    prerequisiteLessonIds: overrides.prerequisiteLessonIds ?? [],
    videoAsset: videoAsset({ durationSeconds: overrides.durationSeconds ?? 100 }),
  })
}

async function createTextLesson(
  courseId: string,
  moduleId: string,
  overrides: { order?: number; status?: ApprovalStatus; prerequisiteLessonIds?: string[] } = {},
) {
  return LessonModel.create({
    courseModuleId: moduleId,
    courseId,
    title: 'Text Lesson',
    order: overrides.order ?? 0,
    lessonType: 'TEXT',
    status: overrides.status ?? 'PUBLISHED',
    isMandatory: true,
    prerequisiteLessonIds: overrides.prerequisiteLessonIds ?? [],
    textContent: '<p>Hello</p>',
  })
}

async function setupEntitledStudent(overrides: { enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' } = {}) {
  const student = await createLoggedInStudent()
  const course = await createPublishedCourseFixture()
  const batch = await createBatchFixture(course._id.toString())
  await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
    status: overrides.enrollmentStatus ?? 'ACTIVE',
  })
  const courseModule = await createModule(course._id.toString())
  return { student, course, batch, courseModule }
}

describe('Learning Player — lesson access, prerequisites, and progress', () => {
  it('an ACTIVE entitled student can open a published lesson and receives content', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString())

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.hasAccess).toBe(true)
    expect(res.body.data.locked).toBe(false)
    expect(res.body.data.video.status).toBe('READY')
  })

  it('a never-enrolled student is denied (404) when opening a lesson', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const courseModule = await createModule(course._id.toString())
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString())

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(404)
  })

  it('a suspended student is denied (403) when requesting the media delivery URL', async () => {
    const { student, course, courseModule } = await setupEntitledStudent({
      enrollmentStatus: 'SUSPENDED',
    })
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString())

    const res = await request(app)
      .get(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/media`,
      )
      .set(bearer(student))

    expect(res.status).toBe(403)
  })

  it('a draft lesson is hidden (404) even for an entitled student', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString(), {
      status: 'DRAFT',
    })

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(404)
  })

  it('a lesson with an incomplete prerequisite is locked — no content revealed', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const prerequisite = await createVideoLesson(
      course._id.toString(),
      courseModule._id.toString(),
      {
        order: 0,
      },
    )
    const dependent = await createVideoLesson(course._id.toString(), courseModule._id.toString(), {
      order: 1,
      prerequisiteLessonIds: [prerequisite._id.toString()],
    })

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/lessons/${dependent._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.locked).toBe(true)
    expect(res.body.data.video).toBeNull()
  })

  it('completing the prerequisite unlocks the dependent lesson', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const prerequisite = await createTextLesson(
      course._id.toString(),
      courseModule._id.toString(),
      {
        order: 0,
      },
    )
    const dependent = await createVideoLesson(course._id.toString(), courseModule._id.toString(), {
      order: 1,
      prerequisiteLessonIds: [prerequisite._id.toString()],
    })

    await request(app)
      .post(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${prerequisite._id.toString()}/complete`,
      )
      .set(bearer(student))

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/lessons/${dependent._id.toString()}`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.locked).toBe(false)
  })

  it('marking a lesson complete twice is idempotent — completedAt never changes', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lesson = await createTextLesson(course._id.toString(), courseModule._id.toString())
    const url = `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/complete`

    const first = await request(app).post(url).set(bearer(student))
    const second = await request(app).post(url).set(bearer(student))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(first.body.data.completedAt).toBe(second.body.data.completedAt)
  })

  it('course progress percentage reflects mandatory lesson completion', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lessonOne = await createTextLesson(course._id.toString(), courseModule._id.toString(), {
      order: 0,
    })
    await createTextLesson(course._id.toString(), courseModule._id.toString(), { order: 1 })

    await request(app)
      .post(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lessonOne._id.toString()}/complete`,
      )
      .set(bearer(student))

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/progress`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.mandatoryLessons).toBe(2)
    expect(res.body.data.completedMandatoryLessons).toBe(1)
    expect(res.body.data.percentage).toBe(50)
  })

  it('rejects a video-position update outside the sane 0–86400s range', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString())

    const res = await request(app)
      .patch(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/progress`,
      )
      .set(bearer(student))
      .send({ positionSeconds: -5 })

    expect(res.status).toBe(400)
  })

  it('a video lesson auto-completes once watched position crosses 90% of duration', async () => {
    const { student, course, courseModule } = await setupEntitledStudent()
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString(), {
      durationSeconds: 100,
    })

    const below = await request(app)
      .patch(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/progress`,
      )
      .set(bearer(student))
      .send({ positionSeconds: 80 })
    expect(below.body.data.status).toBe('IN_PROGRESS')

    const above = await request(app)
      .patch(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/progress`,
      )
      .set(bearer(student))
      .send({ positionSeconds: 91 })
    expect(above.body.data.status).toBe('COMPLETED')
  })

  it("student A completing a lesson never affects student B's course progress", async () => {
    const course = await createPublishedCourseFixture()
    const batch = await createBatchFixture(course._id.toString())
    const courseModule = await createModule(course._id.toString())
    const lesson = await createTextLesson(course._id.toString(), courseModule._id.toString())

    const studentA = await createLoggedInStudent()
    await createEnrollment(studentA.studentId, course._id.toString(), batch._id.toString())
    const studentB = await createLoggedInStudent()
    await createEnrollment(studentB.studentId, course._id.toString(), batch._id.toString())

    await request(app)
      .post(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/complete`,
      )
      .set(bearer(studentA))

    const res = await request(app)
      .get(`/api/v1/student/courses/${course._id.toString()}/progress`)
      .set(bearer(studentB))

    expect(res.status).toBe(200)
    expect(res.body.data.completedLessons).toBe(0)
  })

  it('secure media URL is denied without a real enrollment', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const courseModule = await createModule(course._id.toString())
    const lesson = await createVideoLesson(course._id.toString(), courseModule._id.toString())

    const res = await request(app)
      .get(
        `/api/v1/student/courses/${course._id.toString()}/lessons/${lesson._id.toString()}/media`,
      )
      .set(bearer(student))

    expect(res.status).toBe(404)
  })
})
