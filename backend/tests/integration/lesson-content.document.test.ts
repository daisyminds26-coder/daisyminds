import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { contentPath, setupLessonForType } from '../helpers/lesson-content-fixtures'
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
    url: vi
      .fn()
      .mockReturnValue('https://res.cloudinary.com/demo/raw/authenticated/signed-doc.pdf'),
  },
}))

setupTestDatabase()

beforeEach(() => {
  apiSignRequest.mockClear()
  apiResource.mockReset()
  uploaderDestroy.mockClear()
})

function mockVerifiedDocument(overrides: Record<string, unknown> = {}) {
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/raw/authenticated/lesson-doc.pdf',
    resource_type: 'raw',
    asset_id: 'asset-doc-1',
    format: 'pdf',
    bytes: 512 * 1024,
    version: 1,
    ...overrides,
  })
}

describe('Lesson content — document', () => {
  it('issues a signed upload signature scoped to the lesson document folder', async () => {
    const fixture = await setupLessonForType('lcd1@example.com', 'DOCUMENT')

    const res = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(
      `daisy-minds/courses/${fixture.courseId}/lessons/${fixture.lessonId}/document`,
    )
    expect(res.body.data.resourceType).toBe('raw')
  })

  it('verifies the upload and stores the client-reported display filename alongside server-verified metadata', async () => {
    const fixture = await setupLessonForType('lcd2@example.com', 'DOCUMENT')
    mockVerifiedDocument()

    const sigRes = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId, originalFilename: 'syllabus.pdf' })

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('READY')
    expect(res.body.data.documentAsset.originalFilename).toBe('syllabus.pdf')
    expect(res.body.data.documentAsset.bytes).toBe(512 * 1024)
  })

  it('rejects verifying an asset outside the expected document folder', async () => {
    const fixture = await setupLessonForType('lcd3@example.com', 'DOCUMENT')
    mockVerifiedDocument()

    const res = await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({
        publicId: 'daisy-minds/courses/other-course/lessons/other-lesson/document/doc-1',
        originalFilename: 'syllabus.pdf',
      })

    expect(res.status).toBe(400)
  })

  it('rejects verifying an oversized document', async () => {
    const fixture = await setupLessonForType('lcd4@example.com', 'DOCUMENT')
    mockVerifiedDocument({ bytes: 500 * 1024 * 1024 })

    const sigRes = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId, originalFilename: 'huge.pdf' })

    expect(res.status).toBe(400)
  })

  it('replaces an existing document and deletes the previous Cloudinary asset', async () => {
    const fixture = await setupLessonForType('lcd5@example.com', 'DOCUMENT')
    mockVerifiedDocument()

    const firstSig = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: firstSig.body.data.publicId, originalFilename: 'v1.pdf' })

    const secondSig = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    const res = await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: secondSig.body.data.publicId, originalFilename: 'v2.pdf' })

    expect(res.status).toBe(200)
    expect(res.body.data.documentAsset.originalFilename).toBe('v2.pdf')
    expect(uploaderDestroy).toHaveBeenCalledWith(firstSig.body.data.publicId, {
      resource_type: 'raw',
      type: 'authenticated',
    })
  })

  it('removes a document, going back to EMPTY', async () => {
    const fixture = await setupLessonForType('lcd6@example.com', 'DOCUMENT')
    mockVerifiedDocument()
    const sigRes = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId, originalFilename: 'doc.pdf' })

    const res = await request(app)
      .delete(contentPath(fixture, '/document'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('EMPTY')
    expect(res.body.data.documentAsset).toBeNull()
  })

  it('issues a signed preview URL for an existing document', async () => {
    const fixture = await setupLessonForType('lcd7@example.com', 'DOCUMENT')
    mockVerifiedDocument()
    const sigRes = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/document/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId, originalFilename: 'doc.pdf' })

    const res = await request(app)
      .get(contentPath(fixture, '/document/preview-url'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain('authenticated')
  })

  it('rejects requesting a document signature for a non-DOCUMENT lesson', async () => {
    const fixture = await setupLessonForType('lcd8@example.com', 'VIDEO')

    const res = await request(app)
      .post(contentPath(fixture, '/document/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})
