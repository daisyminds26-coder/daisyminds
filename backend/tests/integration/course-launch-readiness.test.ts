import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { readyToPublishCoursePayload } from '../helpers/course-fixtures'
import { validCreateLessonPayload, validCreateModulePayload } from '../helpers/curriculum-fixtures'
import { loginAs } from '../helpers/auth'
import { setupTestDatabase } from '../setup-db'

const { apiResource } = vi.hoisted(() => ({ apiResource: vi.fn() }))

vi.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    utils: { api_sign_request: vi.fn().mockReturnValue('sig') },
    api: { resource: apiResource },
    uploader: { destroy: vi.fn().mockResolvedValue({ result: 'ok' }) },
  },
}))

setupTestDatabase()

beforeEach(() => {
  apiResource.mockReset()
})

/** Completes the Phase 9A thumbnail flow so course metadata readiness genuinely passes too. */
async function giveCourseThumbnail(accessToken: string, courseId: string) {
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
    resource_type: 'image',
  })
  const sigRes = await request(app)
    .post(`/api/v1/courses/${courseId}/thumbnail/signature`)
    .set('Authorization', `Bearer ${accessToken}`)
  await request(app)
    .post(`/api/v1/courses/${courseId}/thumbnail/verify`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ publicId: sigRes.body.data.publicId })
}

async function createCourse(accessToken: string) {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(readyToPublishCoursePayload())
  return res.body.data.id as string
}

async function createModule(accessToken: string, courseId: string) {
  const res = await request(app)
    .post(`/api/v1/courses/${courseId}/modules`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateModulePayload())
  return res.body.data.id as string
}

async function createLesson(
  accessToken: string,
  courseId: string,
  moduleId: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateLessonPayload(overrides))
  return res.body.data.id as string
}

describe('Course launch readiness', () => {
  it('is not ready for a brand-new course with no curriculum', async () => {
    const admin = await loginAs({ email: 'clr1@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ready).toBe(false)
    expect(res.body.data.curriculumStructureReady).toBe(false)
  })

  it('flags a published module/lesson with no content as blocking launch', async () => {
    const admin = await loginAs({ email: 'clr2@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lessonId = await createLesson(admin.accessToken, courseId, moduleId, {
      lessonType: 'TEXT',
    })
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contentReady).toBe(false)
    expect(res.body.data.ready).toBe(false)
    expect(
      (res.body.data.blockers as { field: string }[]).some((b) => b.field.startsWith('lessons.')),
    ).toBe(true)
  })

  it('is content-ready (independent of course metadata) once the published lesson has READY text content', async () => {
    const admin = await loginAs({ email: 'clr3@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lessonId = await createLesson(admin.accessToken, courseId, moduleId, {
      lessonType: 'TEXT',
    })
    await request(app)
      .put(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content/text`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ textContent: '<p>Ready content</p>' })
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contentReady).toBe(true)
    // Overall `ready` still false — course metadata readiness (thumbnail) is a separate, unmet layer.
    expect(res.body.data.ready).toBe(false)
    expect(res.body.data.courseMetadataReady).toBe(false)
  })

  it('is fully ready once course metadata, curriculum structure, and content are all satisfied', async () => {
    const admin = await loginAs({ email: 'clr3b@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    await giveCourseThumbnail(admin.accessToken, courseId)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lessonId = await createLesson(admin.accessToken, courseId, moduleId, {
      lessonType: 'TEXT',
    })
    await request(app)
      .put(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content/text`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ textContent: '<p>Ready content</p>' })
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.courseMetadataReady).toBe(true)
    expect(res.body.data.curriculumStructureReady).toBe(true)
    expect(res.body.data.contentReady).toBe(true)
    expect(res.body.data.ready).toBe(true)
  })

  it('flags a published QUIZ lesson (NOT_CONFIGURED) as blocking launch, with an honest message', async () => {
    const admin = await loginAs({ email: 'clr4@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lessonId = await createLesson(admin.accessToken, courseId, moduleId, {
      lessonType: 'QUIZ',
    })
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ready).toBe(false)
    const blocker = (res.body.data.blockers as { field: string; message: string }[]).find((b) =>
      b.field.startsWith('lessons.'),
    )
    expect(blocker?.message).toContain('does not support content yet')
  })

  it('does not require enrolment/batch data — the response never mentions students or enrolment', async () => {
    const admin = await loginAs({ email: 'clr5@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(JSON.stringify(res.body.data).toLowerCase()).not.toContain('enrol')
  })

  it('rejects a STUDENT', async () => {
    const admin = await loginAs({ email: 'clr6@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const student = await loginAs({ email: 'clr6-student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/launch-readiness`)
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })
})
