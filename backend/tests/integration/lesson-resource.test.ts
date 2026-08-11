import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { resourcesPath, setupLessonForType } from '../helpers/lesson-content-fixtures'
import { setupTransactionalTestDatabase } from '../setup-db'

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
    url: vi
      .fn()
      .mockReturnValue('https://res.cloudinary.com/demo/raw/authenticated/signed-resource.pdf'),
  },
}))

// Reorder uses a transaction — same requirement as curriculum reorder tests.
setupTransactionalTestDatabase()

beforeEach(() => {
  apiSignRequest.mockClear()
  apiResource.mockReset()
  uploaderDestroy.mockClear()
})

function mockVerifiedResource(overrides: Record<string, unknown> = {}) {
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/raw/authenticated/resource.pdf',
    resource_type: 'raw',
    asset_id: 'asset-res-1',
    format: 'pdf',
    bytes: 200 * 1024,
    version: 1,
    ...overrides,
  })
}

async function addResource(fixture: Awaited<ReturnType<typeof setupLessonForType>>, title: string) {
  mockVerifiedResource()
  const sigRes = await request(app)
    .post(resourcesPath(fixture, '/signature'))
    .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
  return request(app)
    .post(resourcesPath(fixture, '/verify'))
    .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    .send({ publicId: sigRes.body.data.publicId, filename: `${title}.pdf`, title })
}

describe('Lesson resources', () => {
  it('issues a signed upload signature scoped to the lesson resources folder', async () => {
    const fixture = await setupLessonForType('lr1@example.com', 'VIDEO')

    const res = await request(app)
      .post(resourcesPath(fixture, '/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(
      `daisy-minds/courses/${fixture.courseId}/lessons/${fixture.lessonId}/resources`,
    )
  })

  it('verifies and adds a resource, deriving resourceType/mimeType server-side from the verified format', async () => {
    const fixture = await setupLessonForType('lr2@example.com', 'VIDEO')

    const res = await addResource(fixture, 'Syllabus')

    expect(res.status).toBe(201)
    expect(res.body.data.resourceType).toBe('PDF')
    expect(res.body.data.mimeType).toBe('application/pdf')
    expect(res.body.data.sortOrder).toBe(0)
  })

  it('rejects verifying a resource outside the expected folder', async () => {
    const fixture = await setupLessonForType('lr3@example.com', 'VIDEO')
    mockVerifiedResource()

    const res = await request(app)
      .post(resourcesPath(fixture, '/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({
        publicId: 'daisy-minds/courses/other/lessons/other/resources/res-1',
        filename: 'x.pdf',
        title: 'X',
      })

    expect(res.status).toBe(400)
  })

  it('rejects an unsupported/executable format at verification time (defense in depth)', async () => {
    const fixture = await setupLessonForType('lr4@example.com', 'VIDEO')
    mockVerifiedResource({ format: 'exe' })

    const sigRes = await request(app)
      .post(resourcesPath(fixture, '/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .post(resourcesPath(fixture, '/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId, filename: 'malware.exe', title: 'Bad' })

    expect(res.status).toBe(400)
  })

  it('lists resources in sortOrder', async () => {
    const fixture = await setupLessonForType('lr5@example.com', 'VIDEO')
    await addResource(fixture, 'First')
    await addResource(fixture, 'Second')

    const res = await request(app)
      .get(resourcesPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map((r: { title: string }) => r.title)).toEqual(['First', 'Second'])
  })

  it("updates a resource's title/description/isDownloadable without touching its file", async () => {
    const fixture = await setupLessonForType('lr6@example.com', 'VIDEO')
    const addRes = await addResource(fixture, 'Original')
    const resourceId = addRes.body.data.id as string

    const res = await request(app)
      .patch(resourcesPath(fixture, `/${resourceId}`))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ title: 'Renamed', isDownloadable: false })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed')
    expect(res.body.data.isDownloadable).toBe(false)
  })

  it('reorders resources, requiring the full current set exactly once', async () => {
    const fixture = await setupLessonForType('lr7@example.com', 'VIDEO')
    const first = await addResource(fixture, 'First')
    const second = await addResource(fixture, 'Second')

    const res = await request(app)
      .post(resourcesPath(fixture, '/reorder'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({
        items: [
          { id: second.body.data.id, order: 0 },
          { id: first.body.data.id, order: 1 },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.map((r: { title: string }) => r.title)).toEqual(['Second', 'First'])
  })

  it('rejects a reorder payload missing a current resource', async () => {
    const fixture = await setupLessonForType('lr8@example.com', 'VIDEO')
    const first = await addResource(fixture, 'First')
    await addResource(fixture, 'Second')

    const res = await request(app)
      .post(resourcesPath(fixture, '/reorder'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ items: [{ id: first.body.data.id, order: 0 }] })

    expect(res.status).toBe(400)
  })

  it('issues a signed delivery URL for a resource', async () => {
    const fixture = await setupLessonForType('lr9@example.com', 'VIDEO')
    const addRes = await addResource(fixture, 'Doc')

    const res = await request(app)
      .get(resourcesPath(fixture, `/${addRes.body.data.id as string}/delivery-url`))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain('authenticated')
  })

  it('deletes a resource (soft-deletes the record, deletes the verified Cloudinary asset)', async () => {
    const fixture = await setupLessonForType('lr10@example.com', 'VIDEO')
    const addRes = await addResource(fixture, 'Doc')

    const res = await request(app)
      .delete(resourcesPath(fixture, `/${addRes.body.data.id as string}`))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    expect(res.status).toBe(200)
    expect(uploaderDestroy).toHaveBeenCalled()

    const listRes = await request(app)
      .get(resourcesPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    expect(listRes.body.data).toHaveLength(0)
  })

  it('rejects a STUDENT uploading a resource', async () => {
    const fixture = await setupLessonForType('lr11@example.com', 'VIDEO')
    const student = await loginAs({ email: 'lr11-student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(resourcesPath(fixture, '/signature'))
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })
})
