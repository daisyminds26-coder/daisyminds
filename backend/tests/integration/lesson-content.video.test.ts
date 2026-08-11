import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
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
      .mockReturnValue('https://res.cloudinary.com/demo/video/authenticated/signed-preview.mp4'),
  },
}))

setupTestDatabase()

beforeEach(() => {
  apiSignRequest.mockClear()
  apiResource.mockReset()
  uploaderDestroy.mockClear()
})

function mockVerifiedVideo(overrides: Record<string, unknown> = {}) {
  apiResource.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/video/authenticated/lesson-video.mp4',
    resource_type: 'video',
    asset_id: 'asset-123',
    format: 'mp4',
    bytes: 1024 * 1024,
    version: 1,
    duration: 90,
    width: 1280,
    height: 720,
    ...overrides,
  })
}

describe('Lesson content — video', () => {
  it('issues a signed upload signature scoped to the lesson video folder', async () => {
    const fixture = await setupLessonForType('lcv1@example.com', 'VIDEO')

    const res = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(
      `daisy-minds/courses/${fixture.courseId}/lessons/${fixture.lessonId}/video`,
    )
    expect(res.body.data.resourceType).toBe('video')
    expect(res.body.data.type).toBe('authenticated')
  })

  it('verifies the upload independently against Cloudinary and stores safe metadata, never trusting a client-supplied URL', async () => {
    const fixture = await setupLessonForType('lcv2@example.com', 'VIDEO')
    mockVerifiedVideo()

    const sigRes = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    const publicId = sigRes.body.data.publicId as string

    const res = await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId })

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('READY')
    expect(res.body.data.videoAsset.durationSeconds).toBe(90)
    expect(res.body.data.videoAsset.bytes).toBe(1024 * 1024)
    expect(res.body.data).not.toHaveProperty('publicId')
    expect(JSON.stringify(res.body.data.videoAsset)).not.toContain('publicId')
  })

  it("rejects verifying an asset reported outside the lesson's own video folder (cross-lesson/cross-course claim)", async () => {
    const fixture = await setupLessonForType('lcv3@example.com', 'VIDEO')
    mockVerifiedVideo()

    const res = await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({
        publicId: 'daisy-minds/courses/some-other-course/lessons/other-lesson/video/video-1',
      })

    expect(res.status).toBe(400)
  })

  it('rejects verifying an asset whose Cloudinary resource_type does not match video', async () => {
    const fixture = await setupLessonForType('lcv4@example.com', 'VIDEO')
    mockVerifiedVideo({ resource_type: 'image' })

    const sigRes = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    expect(res.status).toBe(400)
  })

  it('rejects verifying an oversized asset', async () => {
    const fixture = await setupLessonForType('lcv5@example.com', 'VIDEO')
    mockVerifiedVideo({ bytes: 10 * 1024 * 1024 * 1024 })

    const sigRes = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    expect(res.status).toBe(400)
  })

  it('replaces an existing video and deletes the previous Cloudinary asset', async () => {
    const fixture = await setupLessonForType('lcv6@example.com', 'VIDEO')
    mockVerifiedVideo()

    const firstSig = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: firstSig.body.data.publicId })

    const secondSig = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    const res = await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: secondSig.body.data.publicId })

    expect(res.status).toBe(200)
    expect(uploaderDestroy).toHaveBeenCalledWith(firstSig.body.data.publicId, {
      resource_type: 'video',
      type: 'authenticated',
    })
  })

  it('removes a video and deletes the Cloudinary asset, going back to EMPTY', async () => {
    const fixture = await setupLessonForType('lcv7@example.com', 'VIDEO')
    mockVerifiedVideo()
    const sigRes = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    const res = await request(app)
      .delete(contentPath(fixture, '/video'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('EMPTY')
    expect(res.body.data.videoAsset).toBeNull()
    expect(uploaderDestroy).toHaveBeenCalled()
  })

  it('rejects removing a video that does not exist', async () => {
    const fixture = await setupLessonForType('lcv8@example.com', 'VIDEO')

    const res = await request(app)
      .delete(contentPath(fixture, '/video'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(422)
  })

  it('issues a short-lived signed preview URL only after the video is ready', async () => {
    const fixture = await setupLessonForType('lcv9@example.com', 'VIDEO')

    const beforeRes = await request(app)
      .get(contentPath(fixture, '/video/preview-url'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    expect(beforeRes.status).toBe(422)

    mockVerifiedVideo()
    const sigRes = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    await request(app)
      .post(contentPath(fixture, '/video/verify'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    const res = await request(app)
      .get(contentPath(fixture, '/video/preview-url'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain('authenticated')
    expect(res.body.data.expiresInSeconds).toBeGreaterThan(0)
  })

  it('rejects a STUDENT requesting an upload signature', async () => {
    const fixture = await setupLessonForType('lcv10@example.com', 'VIDEO')
    const student = await loginAs({ email: 'lcv10-student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('rejects requesting a video signature for a non-VIDEO lesson', async () => {
    const fixture = await setupLessonForType('lcv11@example.com', 'TEXT')

    const res = await request(app)
      .post(contentPath(fixture, '/video/signature'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(409)
  })
})
