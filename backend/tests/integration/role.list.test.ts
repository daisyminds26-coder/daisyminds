import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { createTestRole } from '../helpers/seed'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('GET /api/v1/roles', () => {
  it('lists roles as {id, name} for an ADMIN', async () => {
    const admin = await loginAs({ email: 'admin@example.com', role: 'ADMIN' })
    await createTestRole('TRAINER', [])

    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    const names = (res.body.data as { id: string; name: string }[]).map((role) => role.name)
    expect(names).toContain('ADMIN')
    expect(names).toContain('TRAINER')
  })

  it('rejects a STUDENT', async () => {
    const student = await loginAs({ email: 'student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${student.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/roles')
    expect(res.status).toBe(401)
  })
})
