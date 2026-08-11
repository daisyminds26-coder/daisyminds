import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { readyToPublishCoursePayload, validCreateCoursePayload } from '../helpers/course-fixtures'
import { setupTestDatabase } from '../setup-db'

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

setupTestDatabase()

beforeEach(() => {
  apiResource.mockReset()
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
    resource_type: 'image',
  })
})

async function createCourse(
  accessToken: string,
  overrides: Parameters<typeof readyToPublishCoursePayload>[0] = {},
) {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(readyToPublishCoursePayload(overrides))
  return res.body.data.id as string
}

async function attachThumbnail(accessToken: string, courseId: string) {
  const sigRes = await request(app)
    .post(`/api/v1/courses/${courseId}/thumbnail/signature`)
    .set('Authorization', `Bearer ${accessToken}`)
  const publicId = sigRes.body.data.publicId as string

  await request(app)
    .post(`/api/v1/courses/${courseId}/thumbnail/verify`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ publicId })
}

describe('POST /api/v1/courses/:id/readiness-check', () => {
  it('reports blockers for a bare-minimum course', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken, {})

    const res = await request(app)
      .post(`/api/v1/courses/${id}/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ready).toBe(false)
    expect(res.body.data.blockers.length).toBeGreaterThan(0)
  })

  it('reports ready once description, duration, outcomes, and a thumbnail are present', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await attachThumbnail(admin.accessToken, id)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.ready).toBe(true)
    expect(res.body.data.blockers).toHaveLength(0)
  })
})

describe('POST /api/v1/courses/:id/publish', () => {
  it('publishes a ready course', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await attachThumbnail(admin.accessToken, id)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('PUBLISHED')
    expect(res.body.data.publishedAt).not.toBeNull()
  })

  it('rejects publishing an incomplete course with structured blockers (422)', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken, { description: undefined })

    const res = await request(app)
      .post(`/api/v1/courses/${id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  it('denies a STUDENT', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    const student = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(`/api/v1/courses/${id}/publish`)
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('POST /api/v1/courses/:id/unpublish', () => {
  it('moves a published course back to draft', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await attachThumbnail(admin.accessToken, id)
    await request(app)
      .post(`/api/v1/courses/${id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('rejects unpublishing a course that is not published', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})

describe('POST /api/v1/courses/:id/archive and /restore', () => {
  it('archives a draft course', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ARCHIVED')
    expect(res.body.data.archivedAt).not.toBeNull()
  })

  it('restores an archived course back to draft', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.archivedAt).toBeNull()
  })

  it('rejects archiving an already-archived course', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/v1/courses/:id and restore', () => {
  it('soft-deletes a course', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .delete(`/api/v1/courses/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)

    const getRes = await request(app)
      .get(`/api/v1/courses/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(getRes.status).toBe(404)
  })

  it('restore un-deletes a soft-deleted course', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await request(app)
      .delete(`/api/v1/courses/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isDeleted).toBe(false)
  })

  it('rejects restoring a course that is neither archived nor deleted', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})

describe('audit events', () => {
  it('records course.created, course.published, and course.archived events', async () => {
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    await attachThumbnail(admin.accessToken, id)
    await request(app)
      .post(`/api/v1/courses/${id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${id}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${id}/audit`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const actions = (res.body.data as { action: string }[]).map((entry) => entry.action)
    expect(actions).toEqual(
      expect.arrayContaining([
        'course.created',
        'course.media_changed',
        'course.published',
        'course.unpublished',
        'course.archived',
      ]),
    )
  })
})

describe('validCreateCoursePayload sanity', () => {
  it('a bare minimum course is not ready to publish (no thumbnail)', async () => {
    const admin = await loginAs({ email: 'admin15@example.com', role: 'ADMIN' })
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())

    const readiness = await request(app)
      .post(`/api/v1/courses/${String(res.body.data.id)}/readiness-check`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(readiness.body.data.ready).toBe(false)
  })
})
