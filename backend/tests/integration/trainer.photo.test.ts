import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { ensureTestRole } from '../helpers/seed'
import { validCreateTrainerPayload } from '../helpers/trainer-fixtures'
import { setupTestDatabase } from '../setup-db'

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

setupTestDatabase()

beforeEach(async () => {
  apiSignRequest.mockClear()
  apiResource.mockReset()
  uploaderDestroy.mockClear()
  await ensureTestRole('TRAINER', [])
})

async function createTrainer(accessToken: string, email: string) {
  const res = await request(app)
    .post('/api/v1/trainers')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateTrainerPayload({ email }))
  return res.body.data.id as string
}

describe('trainer profile photo upload', () => {
  it('issues a signed upload signature scoped to the trainer folder', async () => {
    const admin = await loginAs({ email: 'photo-admin1@example.com', role: 'ADMIN' })
    const trainerId = await createTrainer(admin.accessToken, 'photo1@example.com')

    const res = await request(app)
      .post(`/api/v1/trainers/${trainerId}/photo/signature`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.folder).toBe(`daisy-minds/trainers/${trainerId}`)
    expect(res.body.data.publicId).toMatch(
      new RegExp(`^daisy-minds/trainers/${trainerId}/profile-`),
    )
    expect(res.body.data.signature).toBe('fake-signature')
    expect(apiSignRequest).toHaveBeenCalledTimes(1)
  })

  it('confirms an upload only after verifying it against the Cloudinary Admin API', async () => {
    const admin = await loginAs({ email: 'photo-admin2@example.com', role: 'ADMIN' })
    const trainerId = await createTrainer(admin.accessToken, 'photo2@example.com')
    const publicId = `daisy-minds/trainers/${trainerId}/profile-123`
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
      resource_type: 'image',
    })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId })

    expect(res.status).toBe(200)
    expect(res.body.data.profilePhotoUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/photo.jpg',
    )
    expect(apiResource).toHaveBeenCalledWith(publicId, { resource_type: 'image' })
  })

  it('rejects a publicId outside the expected folder', async () => {
    const admin = await loginAs({ email: 'photo-admin3@example.com', role: 'ADMIN' })
    const trainerId = await createTrainer(admin.accessToken, 'photo3@example.com')
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/other.jpg',
      resource_type: 'image',
    })

    const res = await request(app)
      .patch(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: 'daisy-minds/some-other-folder/photo' })

    expect(res.status).toBe(400)
  })

  it('deletes the previous asset when replacing a photo, and removes it entirely on delete', async () => {
    const admin = await loginAs({ email: 'photo-admin4@example.com', role: 'ADMIN' })
    const trainerId = await createTrainer(admin.accessToken, 'photo4@example.com')
    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/first.jpg',
      resource_type: 'image',
    })

    const firstPublicId = `daisy-minds/trainers/${trainerId}/profile-1`
    await request(app)
      .patch(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: firstPublicId })

    apiResource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/second.jpg',
      resource_type: 'image',
    })
    const secondPublicId = `daisy-minds/trainers/${trainerId}/profile-2`
    await request(app)
      .patch(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ publicId: secondPublicId })

    expect(uploaderDestroy).toHaveBeenCalledWith(firstPublicId, { resource_type: 'image' })

    const removeRes = await request(app)
      .delete(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(removeRes.status).toBe(200)
    expect(removeRes.body.data.profilePhotoUrl).toBeNull()
    expect(uploaderDestroy).toHaveBeenCalledWith(secondPublicId, { resource_type: 'image' })
  })

  it('rejects removing a photo when none exists', async () => {
    const admin = await loginAs({ email: 'photo-admin5@example.com', role: 'ADMIN' })
    const trainerId = await createTrainer(admin.accessToken, 'photo5@example.com')

    const res = await request(app)
      .delete(`/api/v1/trainers/${trainerId}/photo`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(422)
  })
})
