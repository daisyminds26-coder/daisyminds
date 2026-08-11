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

async function createModule(
  accessToken: string,
  courseId: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app)
    .post(`/api/v1/courses/${courseId}/modules`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateModulePayload(overrides))
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

describe('Curriculum — modules', () => {
  it('returns an empty curriculum tree for a brand-new course', async () => {
    const admin = await loginAs({ email: 'cm1@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.modules).toEqual([])
  })

  it('creates a module', async () => {
    const admin = await loginAs({ email: 'cm2@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await createModule(admin.accessToken, courseId)

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Getting Started')
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.order).toBe(0)
  })

  it('appends new modules to the end in creation order', async () => {
    const admin = await loginAs({ email: 'cm3@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const first = await createModule(admin.accessToken, courseId, { title: 'Module 1' })
    const second = await createModule(admin.accessToken, courseId, { title: 'Module 2' })

    expect(first.body.data.order).toBe(0)
    expect(second.body.data.order).toBe(1)
  })

  it('rejects a module with a blank title', async () => {
    const admin = await loginAs({ email: 'cm4@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await createModule(admin.accessToken, courseId, { title: '' })

    expect(res.status).toBe(400)
  })

  it('updates a module', async () => {
    const admin = await loginAs({ email: 'cm5@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data

    const res = await request(app)
      .patch(`/api/v1/courses/${courseId}/modules/${String(module.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Renamed module', estimatedDurationMinutes: 45 })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed module')
    expect(res.body.data.estimatedDurationMinutes).toBe(45)
  })

  it('404s when a module id belongs to a different course', async () => {
    const admin = await loginAs({ email: 'cm6@example.com', role: 'ADMIN' })
    const courseAId = await createCourse(admin.accessToken)
    const courseBId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseAId)).body.data

    const res = await request(app)
      .patch(`/api/v1/courses/${courseBId}/modules/${String(module.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Should not work' })

    expect(res.status).toBe(404)
  })

  it('reorders modules', async () => {
    const admin = await loginAs({ email: 'cm7@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const a = (await createModule(admin.accessToken, courseId, { title: 'A' })).body.data
    const b = (await createModule(admin.accessToken, courseId, { title: 'B' })).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/reorder`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        items: [
          { id: a.id, order: 1 },
          { id: b.id, order: 0 },
        ],
      })

    expect(res.status).toBe(200)
    const byId = Object.fromEntries(
      (res.body.data as { id: string; order: number }[]).map((m) => [m.id, m.order]),
    )
    expect(byId[b.id]).toBe(0)
    expect(byId[a.id]).toBe(1)
  })

  it('rejects a reorder payload with a duplicate id', async () => {
    const admin = await loginAs({ email: 'cm8@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const a = (await createModule(admin.accessToken, courseId)).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/reorder`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        items: [
          { id: a.id, order: 0 },
          { id: a.id, order: 1 },
        ],
      })

    expect(res.status).toBe(400)
  })

  it('rejects a reorder payload naming an id that is not a current module', async () => {
    const admin = await loginAs({ email: 'cm9@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    await createModule(admin.accessToken, courseId)
    const unrelatedCourseId = await createCourse(admin.accessToken)
    const unrelated = (await createModule(admin.accessToken, unrelatedCourseId)).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/reorder`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ items: [{ id: unrelated.id, order: 0 }] })

    expect(res.status).toBe(400)
  })

  it('leaves existing orders untouched when a reorder request is rejected (validate-before-write)', async () => {
    const admin = await loginAs({ email: 'cm10@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const a = (await createModule(admin.accessToken, courseId, { title: 'A' })).body.data
    const b = (await createModule(admin.accessToken, courseId, { title: 'B' })).body.data

    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/reorder`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ items: [{ id: a.id, order: 0 }] }) // missing `b` — rejected

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const byId = Object.fromEntries(
      (tree.body.data.modules as { id: string; order: number }[]).map((m) => [m.id, m.order]),
    )
    expect(byId[a.id]).toBe(0)
    expect(byId[b.id]).toBe(1)
  })

  it('duplicates a module and its lessons, remapping in-module prerequisites', async () => {
    const admin = await loginAs({ email: 'cm11@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    const l1 = (await createLesson(admin.accessToken, courseId, module.id, { title: 'L1' })).body
      .data
    await createLesson(admin.accessToken, courseId, module.id, {
      title: 'L2',
      prerequisiteLessonIds: [l1.id],
    })

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/duplicate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Getting Started (Copy)')

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const duplicatedModule = tree.body.data.modules.find(
      (m: { id: string }) => m.id === res.body.data.id,
    )
    expect(duplicatedModule.lessons).toHaveLength(2)
    const duplicatedL2 = duplicatedModule.lessons.find((l: { title: string }) => l.title === 'L2')
    const duplicatedL1 = duplicatedModule.lessons.find((l: { title: string }) => l.title === 'L1')
    expect(duplicatedL2.prerequisiteLessonIds).toEqual([duplicatedL1.id])
  })

  it('archives a module', async () => {
    const admin = await loginAs({ email: 'cm12@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ARCHIVED')
  })

  it('publishes then unpublishes a module', async () => {
    const admin = await loginAs({ email: 'cm13@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data

    const published = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(published.body.data.status).toBe('PUBLISHED')

    const unpublished = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(unpublished.body.data.status).toBe('DRAFT')
  })

  it('restores an archived module back to draft', async () => {
    const admin = await loginAs({ email: 'cm14@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('deletes a module and cascades soft-delete to its active lessons, then restore brings both back', async () => {
    const admin = await loginAs({ email: 'cm15@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    const lesson = (await createLesson(admin.accessToken, courseId, module.id)).body.data

    const deleteRes = await request(app)
      .delete(`/api/v1/courses/${courseId}/modules/${String(module.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(deleteRes.status).toBe(200)

    const treeAfterDelete = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(treeAfterDelete.body.data.modules).toHaveLength(0)

    const restoreRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(restoreRes.status).toBe(200)

    const treeAfterRestore = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(treeAfterRestore.body.data.modules).toHaveLength(1)
    expect(treeAfterRestore.body.data.modules[0].lessons).toHaveLength(1)
    expect(treeAfterRestore.body.data.modules[0].lessons[0].id).toBe(lesson.id)
  })

  it('does not resurrect a lesson that was independently deleted before its module was deleted', async () => {
    const admin = await loginAs({ email: 'cm16@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    const independentlyDeleted = (
      await createLesson(admin.accessToken, courseId, module.id, {
        title: 'Deleted first',
      })
    ).body.data
    await createLesson(admin.accessToken, courseId, module.id, { title: 'Still active' })

    await request(app)
      .delete(
        `/api/v1/courses/${courseId}/modules/${String(module.id)}/lessons/${String(independentlyDeleted.id)}`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)

    await request(app)
      .delete(`/api/v1/courses/${courseId}/modules/${String(module.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(tree.body.data.modules[0].lessons).toHaveLength(1)
    expect(tree.body.data.modules[0].lessons[0].title).toBe('Still active')
  })

  it('excludes deleted modules and lessons from the curriculum tree', async () => {
    const admin = await loginAs({ email: 'cm17@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    await request(app)
      .delete(`/api/v1/courses/${courseId}/modules/${String(module.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(tree.body.data.modules).toEqual([])
  })

  it('still shows an archived (not deleted) module in the tree', async () => {
    const admin = await loginAs({ email: 'cm18@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const module = (await createModule(admin.accessToken, courseId)).body.data
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${String(module.id)}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(tree.body.data.modules).toHaveLength(1)
    expect(tree.body.data.modules[0].status).toBe('ARCHIVED')
  })
})
