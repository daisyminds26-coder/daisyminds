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

async function createModule(accessToken: string, courseId: string, title = 'Module 1') {
  const res = await request(app)
    .post(`/api/v1/courses/${courseId}/modules`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateModulePayload({ title }))
  return res.body.data.id as string
}

async function createLesson(
  accessToken: string,
  courseId: string,
  moduleId: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app)
    .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateLessonPayload(overrides))
}

describe('Curriculum — lessons', () => {
  it('creates a lesson', async () => {
    const admin = await loginAs({ email: 'cl1@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)

    const res = await createLesson(admin.accessToken, courseId, moduleId)

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Welcome')
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.order).toBe(0)
  })

  it('appends new lessons to the end of the module', async () => {
    const admin = await loginAs({ email: 'cl2@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)

    const first = await createLesson(admin.accessToken, courseId, moduleId, { title: 'L1' })
    const second = await createLesson(admin.accessToken, courseId, moduleId, { title: 'L2' })

    expect(first.body.data.order).toBe(0)
    expect(second.body.data.order).toBe(1)
  })

  it('rejects a lesson with a blank title', async () => {
    const admin = await loginAs({ email: 'cl3@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)

    const res = await createLesson(admin.accessToken, courseId, moduleId, { title: '' })

    expect(res.status).toBe(400)
  })

  it('updates a lesson', async () => {
    const admin = await loginAs({ email: 'cl4@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lesson = (await createLesson(admin.accessToken, courseId, moduleId)).body.data

    const res = await request(app)
      .patch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(lesson.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Renamed lesson', isMandatory: false })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed lesson')
    expect(res.body.data.isMandatory).toBe(false)
  })

  it('reorders lessons within a module', async () => {
    const admin = await loginAs({ email: 'cl5@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })).body.data
    const b = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons/reorder`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        moduleId,
        items: [
          { id: a.id, order: 1 },
          { id: b.id, order: 0 },
        ],
      })

    expect(res.status).toBe(200)
    const byId = Object.fromEntries(
      (res.body.data as { id: string; order: number }[]).map((l) => [l.id, l.order]),
    )
    expect(byId[b.id]).toBe(0)
    expect(byId[a.id]).toBe(1)
  })

  it('moves a lesson to a different module in the same course, compacting both modules', async () => {
    const admin = await loginAs({ email: 'cl6@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleAId = await createModule(admin.accessToken, courseId, 'Module A')
    const moduleBId = await createModule(admin.accessToken, courseId, 'Module B')
    const lesson = (await createLesson(admin.accessToken, courseId, moduleAId)).body.data
    await createLesson(admin.accessToken, courseId, moduleAId, { title: 'Stays behind' })

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons/${String(lesson.id)}/move`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetModuleId: moduleBId, targetOrder: 0 })

    expect(res.status).toBe(200)
    expect(res.body.data.courseModuleId).toBe(moduleBId)
    expect(res.body.data.order).toBe(0)

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const moduleA = tree.body.data.modules.find((m: { id: string }) => m.id === moduleAId)
    expect(moduleA.lessons).toHaveLength(1)
    expect(moduleA.lessons[0].order).toBe(0)
  })

  it('rejects moving a lesson to a module in a different course', async () => {
    const admin = await loginAs({ email: 'cl7@example.com', role: 'ADMIN' })
    const courseAId = await createCourse(admin.accessToken)
    const courseBId = await createCourse(admin.accessToken)
    const moduleAId = await createModule(admin.accessToken, courseAId)
    const moduleBId = await createModule(admin.accessToken, courseBId)
    const lesson = (await createLesson(admin.accessToken, courseAId, moduleAId)).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseAId}/lessons/${String(lesson.id)}/move`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ targetModuleId: moduleBId, targetOrder: 0 })

    expect(res.status).toBe(404)
  })

  it('duplicates a lesson, inserting it immediately after the source', async () => {
    const admin = await loginAs({ email: 'cl8@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const source = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'Source' }))
      .body.data
    await createLesson(admin.accessToken, courseId, moduleId, { title: 'After' })

    const res = await request(app)
      .post(
        `/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(source.id)}/duplicate`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Source (Copy)')
    expect(res.body.data.order).toBe(1)

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const orderedTitles = tree.body.data.modules[0].lessons
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((l: { title: string }) => l.title)
    expect(orderedTitles).toEqual(['Source', 'Source (Copy)', 'After'])
  })

  it('archives then publishes/unpublishes a lesson', async () => {
    const admin = await loginAs({ email: 'cl9@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lesson = (await createLesson(admin.accessToken, courseId, moduleId)).body.data

    const archived = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(lesson.id)}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(archived.body.data.status).toBe('ARCHIVED')

    const published = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(lesson.id)}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(published.body.data.status).toBe('PUBLISHED')

    const unpublished = await request(app)
      .post(
        `/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(lesson.id)}/unpublish`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(unpublished.body.data.status).toBe('DRAFT')
  })

  it('deletes a lesson and compacts the remaining orders, then restore appends it back', async () => {
    const admin = await loginAs({ email: 'cl10@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const a = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'A' })).body.data
    const b = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'B' })).body.data
    const c = (await createLesson(admin.accessToken, courseId, moduleId, { title: 'C' })).body.data

    const deleteRes = await request(app)
      .delete(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(b.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const treeAfterDelete = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const remaining = treeAfterDelete.body.data.modules[0].lessons as {
      id: string
      order: number
    }[]
    expect(remaining).toHaveLength(2)
    expect(remaining.find((l) => l.id === a.id)?.order).toBe(0)
    expect(remaining.find((l) => l.id === c.id)?.order).toBe(1)

    const restoreRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${String(b.id)}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(restoreRes.status).toBe(200)
    expect(restoreRes.body.data.order).toBe(2)
  })
})
