import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { validCreateCoursePayload } from '../helpers/course-fixtures'
import { validCreateLessonPayload, validCreateModulePayload } from '../helpers/curriculum-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTransactionalTestDatabase()

async function createCourse(accessToken: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateCoursePayload())
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

async function updateLesson(
  accessToken: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  body: Record<string, unknown>,
) {
  return request(app)
    .patch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body)
}

describe('Curriculum — lesson prerequisites', () => {
  it('accepts a valid prerequisite within the same course', async () => {
    const admin = await loginAs({ email: 'cp1@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })
    const b = await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })

    const res = await updateLesson(admin.accessToken, courseId, moduleId, b, {
      prerequisiteLessonIds: [a],
    })

    expect(res.status).toBe(200)
    expect(res.body.data.prerequisiteLessonIds).toEqual([a])
  })

  it('rejects a lesson listing itself as a prerequisite', async () => {
    const admin = await loginAs({ email: 'cp2@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId)

    const res = await updateLesson(admin.accessToken, courseId, moduleId, a, {
      prerequisiteLessonIds: [a],
    })

    expect(res.status).toBe(400)
  })

  it('rejects a prerequisite lesson from a different course', async () => {
    const admin = await loginAs({ email: 'cp3@example.com', role: 'ADMIN' })
    const courseAId = await createCourse(admin.accessToken)
    const courseBId = await createCourse(admin.accessToken)
    const moduleAId = await createModule(admin.accessToken, courseAId)
    const moduleBId = await createModule(admin.accessToken, courseBId)
    const foreignLesson = await createLesson(admin.accessToken, courseBId, moduleBId)
    const lesson = await createLesson(admin.accessToken, courseAId, moduleAId)

    const res = await updateLesson(admin.accessToken, courseAId, moduleAId, lesson, {
      prerequisiteLessonIds: [foreignLesson],
    })

    expect(res.status).toBe(400)
  })

  it('rejects a prerequisite id that does not exist', async () => {
    const admin = await loginAs({ email: 'cp4@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lesson = await createLesson(admin.accessToken, courseId, moduleId)

    const res = await updateLesson(admin.accessToken, courseId, moduleId, lesson, {
      prerequisiteLessonIds: ['000000000000000000000000'],
    })

    expect(res.status).toBe(400)
  })

  it('rejects a duplicate id within the same prerequisite list', async () => {
    const admin = await loginAs({ email: 'cp5@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })
    const b = await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })

    const res = await updateLesson(admin.accessToken, courseId, moduleId, b, {
      prerequisiteLessonIds: [a, a],
    })

    expect(res.status).toBe(400)
  })

  it('rejects a direct cycle (A requires B, B requires A)', async () => {
    const admin = await loginAs({ email: 'cp6@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })
    const b = await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })
    await updateLesson(admin.accessToken, courseId, moduleId, b, { prerequisiteLessonIds: [a] })

    const res = await updateLesson(admin.accessToken, courseId, moduleId, a, {
      prerequisiteLessonIds: [b],
    })

    expect(res.status).toBe(400)
  })

  it('rejects an indirect cycle (A->B, B->C, then C->A)', async () => {
    const admin = await loginAs({ email: 'cp7@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })
    const b = await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })
    const c = await createLesson(admin.accessToken, courseId, moduleId, { title: 'C' })
    await updateLesson(admin.accessToken, courseId, moduleId, a, { prerequisiteLessonIds: [b] })
    await updateLesson(admin.accessToken, courseId, moduleId, b, { prerequisiteLessonIds: [c] })

    const res = await updateLesson(admin.accessToken, courseId, moduleId, c, {
      prerequisiteLessonIds: [a],
    })

    expect(res.status).toBe(400)
  })

  it('rejects a prerequisite pointing at a deleted lesson', async () => {
    const admin = await loginAs({ email: 'cp8@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })
    const b = await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })
    await request(app)
      .delete(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${a}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await updateLesson(admin.accessToken, courseId, moduleId, b, {
      prerequisiteLessonIds: [a],
    })

    expect(res.status).toBe(400)
  })
})
