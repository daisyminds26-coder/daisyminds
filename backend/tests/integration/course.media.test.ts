import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { validCreateCoursePayload } from '../helpers/course-fixtures'
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
  apiSignRequest.mockClear()
  apiResource.mockReset()
  uploaderDestroy.mockClear()
})

async function createCourse(accessToken: string) {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateCoursePayload())
  return res.body.data.id as string
}

describe('course thumbnail upload', () => {
  it('issues a signed upload signature scoped to the thumbnail folder', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(`daisy-minds/courses/${id}/thumbnail`)
  })

  it('verifies and stores the uploaded thumbnail, never trusting the client alone', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
      resource_type: 'image',
    })

    const sigRes = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const publicId = sigRes.body.data.publicId as string

    const res = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId })

    expect(res.status).toBe(200)
    expect(res.body.data.thumbnailUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/thumb.jpg',
    )
    expect(apiResource).toHaveBeenCalledWith(publicId, { resource_type: 'image' })
  })

  it('rejects a publicId outside the expected folder', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/other.jpg',
      resource_type: 'image',
    })

    const res = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: 'daisy-minds/courses/some-other-id/thumbnail/thumb' })

    expect(res.status).toBe(400)
  })

  it('deletes the previous thumbnail asset when replacing it', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/first.jpg',
      resource_type: 'image',
    })
    const firstSig = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: firstSig.body.data.publicId })

    const secondSig = await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${id}/thumbnail/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: secondSig.body.data.publicId })

    expect(uploaderDestroy).toHaveBeenCalledWith(firstSig.body.data.publicId, {
      resource_type: 'image',
    })
  })

  it('rejects removing a thumbnail when none exists', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .delete(`/api/v1/courses/${id}/thumbnail`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })
})

describe('course banner upload', () => {
  it('issues a signed upload signature scoped to the banner folder, independent of the thumbnail folder', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    const res = await request(app)
      .post(`/api/v1/courses/${id}/banner/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(`daisy-minds/courses/${id}/banner`)
  })

  it('verifies and removes the banner independently of the thumbnail', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
      resource_type: 'image',
    })
    const sigRes = await request(app)
      .post(`/api/v1/courses/${id}/banner/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    await request(app)
      .post(`/api/v1/courses/${id}/banner/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: sigRes.body.data.publicId })

    const res = await request(app)
      .delete(`/api/v1/courses/${id}/banner`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.bannerUrl).toBeNull()
    expect(res.body.data.thumbnailUrl).toBeNull()
  })
})
