import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { ensureTestRole } from '../helpers/seed'
import { validCreateStudentPayload } from '../helpers/student-fixtures'
import { setupTestDatabase } from '../setup-db'

vi.mock('../../src/queues/auth-email.queue', () => ({
  enqueueAuthEmail: vi.fn().mockResolvedValue(undefined),
}))

setupTestDatabase()

beforeEach(async () => {
  await ensureTestRole('STUDENT', [])
})

describe('GET /api/v1/dashboard/admin — recent activity, permission-aware', () => {
  it('is null for an ADMIN (no SUPER_ADMIN-only audit access)', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu1@example.com', sendInvitation: false }))

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.recentActivity).toBeNull()
  })

  it('is a populated array for a SUPER_ADMIN, reflecting a student.created event', async () => {
    const superAdmin = await loginAs({ email: 'super1@example.com', role: 'SUPER_ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu2@example.com', sendInvitation: false }))

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    expect(res.status).toBe(200)
    const activity = res.body.data.recentActivity as Record<string, unknown>[]
    expect(Array.isArray(activity)).toBe(true)
    expect(activity.some((entry) => entry.action === 'student.created')).toBe(true)
  })

  it('never exposes raw audit fields — metadata, ipAddress, userAgent — in the activity feed', async () => {
    const superAdmin = await loginAs({ email: 'super2@example.com', role: 'SUPER_ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(validCreateStudentPayload({ email: 'stu3@example.com', sendInvitation: false }))

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const activity = res.body.data.recentActivity as Record<string, unknown>[]
    for (const entry of activity) {
      expect(entry.metadata).toBeUndefined()
      expect(entry.ipAddress).toBeUndefined()
      expect(entry.userAgent).toBeUndefined()
      expect(Object.keys(entry).sort()).toEqual(
        ['action', 'actorLabel', 'createdAt', 'entityLabel', 'entityType', 'id'].sort(),
      )
    }
  })

  it('resolves a human-readable entityLabel and actorLabel instead of raw ObjectIds', async () => {
    const superAdmin = await loginAs({ email: 'super3@example.com', role: 'SUPER_ADMIN' })
    await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send(
        validCreateStudentPayload({
          email: 'stu4@example.com',
          sendInvitation: false,
          firstName: 'Zoya',
        }),
      )

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const activity = res.body.data.recentActivity as {
      action: string
      entityLabel: string
      actorLabel: string
    }[]
    const created = activity.find((entry) => entry.action === 'student.created')
    expect(created?.entityLabel).toContain('Zoya')
    expect(created?.actorLabel).toBe('super3@example.com')
  })

  it('excludes non-allowlisted actions (e.g. auth.login.success) from the activity feed', async () => {
    const superAdmin = await loginAs({ email: 'super4@example.com', role: 'SUPER_ADMIN' })
    // The login above itself writes an `auth.login.success` audit entry.
    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const activity = res.body.data.recentActivity as { action: string }[]
    expect(activity.every((entry) => !entry.action.startsWith('auth.'))).toBe(true)
  })

  it('limits the activity feed to a small, bounded count', async () => {
    const superAdmin = await loginAs({ email: 'super5@example.com', role: 'SUPER_ADMIN' })
    for (let i = 0; i < 20; i += 1) {
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${superAdmin.accessToken}`)
        .send(
          validCreateStudentPayload({
            email: `bulk-${String(i)}@example.com`,
            sendInvitation: false,
          }),
        )
    }

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)

    const activity = res.body.data.recentActivity as unknown[]
    expect(activity.length).toBeLessThanOrEqual(15)
  })
})
