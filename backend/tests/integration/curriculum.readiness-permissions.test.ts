import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { generateOpenApiDocument } from '../../src/config/swagger'
import { loginAs } from '../helpers/auth'
import { readyToPublishCoursePayload, validCreateCoursePayload } from '../helpers/course-fixtures'
import { validCreateLessonPayload, validCreateModulePayload } from '../helpers/curriculum-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

const { apiSignRequest, apiResource, uploaderDestroy } = vi.hoisted(() => ({
  apiSignRequest: vi.fn().mockReturnValue('fake-signature'),
  apiResource: vi.fn(),
  uploaderDestroy: vi.fn().mockResolvedValue({ result: 'ok' }),
}))

vi.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    utils: { api_sign_request: apiSignRequest },
    api: { resource: apiResource },
    uploader: { destroy: uploaderDestroy },
  },
}))

setupTransactionalTestDatabase()

async function createCourse(
  accessToken: string,
  payload = validCreateCoursePayload(),
): Promise<string> {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
  return res.body.data.id as string
}

async function createModule(accessToken: string, courseId: string) {
  const res = await request(app)
    .post(`/api/v1/courses/${courseId}/modules`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateModulePayload())
  return res.body.data.id as string
}

async function createLesson(accessToken: string, courseId: string, moduleId: string) {
  const res = await request(app)
    .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateLessonPayload())
  return res.body.data.id as string
}

describe('Curriculum — structural readiness', () => {
  it('reports not ready with no modules and no lessons', async () => {
    const admin = await loginAs({ email: 'cr1@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/curriculum/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ready).toBe(false)
    expect(res.body.data.blockers.some((b: { field: string }) => b.field === 'modules')).toBe(true)
    expect(res.body.data.blockers.some((b: { field: string }) => b.field === 'lessons')).toBe(true)
    expect(res.body.data.summary.moduleCount).toBe(0)
  })

  it('reports ready once at least one module and one lesson exist', async () => {
    const admin = await loginAs({ email: 'cr2@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    await createLesson(admin.accessToken, courseId, moduleId)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/curriculum/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.ready).toBe(true)
    expect(res.body.data.blockers).toEqual([])
    expect(res.body.data.summary).toMatchObject({ moduleCount: 1, lessonCount: 1 })
  })

  it('flags a published lesson whose module is archived as a blocker', async () => {
    const admin = await loginAs({ email: 'cr3@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    const lessonId = await createLesson(admin.accessToken, courseId, moduleId)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/modules/${moduleId}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/curriculum/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.ready).toBe(false)
    expect(
      res.body.data.blockers.some((b: { message: string }) => b.message.includes('archived')),
    ).toBe(true)
  })
})

describe('Curriculum — permissions', () => {
  it('allows an ADMIN to create a module', async () => {
    const admin = await loginAs({ email: 'cr4@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateModulePayload())

    expect(res.status).toBe(201)
  })

  it('denies a STUDENT (no courses:manage permission)', async () => {
    const admin = await loginAs({ email: 'cr5admin@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const student = await loginAs({ email: 'cr5@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(validCreateModulePayload())

    expect(res.status).toBe(403)
  })

  it('denies a TRAINER (no courses:manage permission)', async () => {
    const admin = await loginAs({ email: 'cr6admin@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const trainer = await loginAs({ email: 'cr6@example.com', role: 'TRAINER' })

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send(validCreateModulePayload())

    expect(res.status).toBe(403)
  })
})

describe('Curriculum — course lifecycle interaction', () => {
  it('rejects curriculum writes for a soft-deleted course', async () => {
    const admin = await loginAs({ email: 'cr7@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    await request(app)
      .delete(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateModulePayload())

    expect(res.status).toBe(404)
  })

  it('rejects curriculum writes while the course is archived, but reads still work', async () => {
    const admin = await loginAs({ email: 'cr8@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    await request(app)
      .post(`/api/v1/courses/${courseId}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const writeRes = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateModulePayload())
    expect(writeRes.status).toBe(409)

    const readRes = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(readRes.status).toBe(200)
  })

  it('does not require curriculum for an existing course to publish (Phase 9A metadata readiness is unaffected)', async () => {
    const admin = await loginAs({ email: 'cr9@example.com', role: 'ADMIN' })
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
      resource_type: 'image',
    })
    const courseId = await createCourse(admin.accessToken, readyToPublishCoursePayload())
    const sigRes = await request(app)
      .post(`/api/v1/courses/${courseId}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${courseId}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    const publishRes = await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(publishRes.status).toBe(200)
    expect(publishRes.body.data.status).toBe('PUBLISHED')
  })
})

describe('Curriculum — audit, serialization, and OpenAPI', () => {
  it('records curriculum mutations on the course audit timeline', async () => {
    const admin = await loginAs({ email: 'cr10@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    await createModule(admin.accessToken, courseId)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/audit`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(
      (res.body.data as { action: string }[]).some((e) => e.action === 'curriculum.module.created'),
    ).toBe(true)
  })

  it('never leaks Mongoose internals in module/lesson responses', async () => {
    const admin = await loginAs({ email: 'cr11@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const moduleId = await createModule(admin.accessToken, courseId)
    await createLesson(admin.accessToken, courseId, moduleId)

    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const moduleKeys = Object.keys(res.body.data.modules[0])
    const lessonKeys = Object.keys(res.body.data.modules[0].lessons[0])
    expect(moduleKeys).not.toContain('$__')
    expect(moduleKeys).not.toContain('_doc')
    expect(lessonKeys).not.toContain('$__')
    expect(lessonKeys).not.toContain('_doc')
  })

  it('registers curriculum paths in the OpenAPI document', () => {
    const doc = generateOpenApiDocument()
    expect(doc.paths['/courses/{courseId}/curriculum']).toBeDefined()
    expect(doc.paths['/courses/{courseId}/modules']).toBeDefined()
  })
})

describe('Curriculum — concurrent reorder integrity', () => {
  it('leaves the module set internally consistent after two concurrent reorder requests', async () => {
    const admin = await loginAs({ email: 'cr12@example.com', role: 'ADMIN' })
    const courseId = await createCourse(admin.accessToken)
    const a = await createModule(admin.accessToken, courseId)
    const b = await createModule(admin.accessToken, courseId)

    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/courses/${courseId}/modules/reorder`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          items: [
            { id: a, order: 0 },
            { id: b, order: 1 },
          ],
        }),
      request(app)
        .post(`/api/v1/courses/${courseId}/modules/reorder`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          items: [
            { id: a, order: 1 },
            { id: b, order: 0 },
          ],
        }),
    ])

    expect([res1.status, res2.status]).toEqual([200, 200])

    const tree = await request(app)
      .get(`/api/v1/courses/${courseId}/curriculum`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const orders = (tree.body.data.modules as { order: number }[]).map((m) => m.order).sort()
    expect(orders).toEqual([0, 1])
  })
})
