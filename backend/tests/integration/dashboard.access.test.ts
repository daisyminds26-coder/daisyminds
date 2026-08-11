import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { generateOpenApiDocument } from '../../src/config/swagger'
import { loginAs } from '../helpers/auth'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('GET /api/v1/dashboard/admin — access control', () => {
  it('allows SUPER_ADMIN', async () => {
    const actor = await loginAs({ email: 'super1@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(200)
  })

  it('allows ADMIN', async () => {
    const actor = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(200)
  })

  it('denies TRAINER', async () => {
    const actor = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('denies STUDENT', async () => {
    const actor = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('denies an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/dashboard/admin')
    expect(res.status).toBe(401)
  })

  it('denies an ADMIN without the dashboard:read permission explicitly granted', async () => {
    const actor = await loginAs({
      email: 'admin-restricted@example.com',
      role: 'ADMIN',
      permissions: ['users:read'],
    })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/dashboard/admin — query validation', () => {
  it('defaults to LAST_30_DAYS with no query params', async () => {
    const actor = await loginAs({ email: 'super2@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.period.range).toBe('LAST_30_DAYS')
  })

  it('rejects an unrecognized range value', async () => {
    const actor = await loginAs({ email: 'super3@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin?range=LAST_QUARTER')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('rejects range=CUSTOM without startDate/endDate', async () => {
    const actor = await loginAs({ email: 'super4@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin?range=CUSTOM')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('rejects range=CUSTOM with endDate before startDate', async () => {
    const actor = await loginAs({ email: 'super5@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get(
        '/api/v1/dashboard/admin?range=CUSTOM&startDate=2026-02-01T00:00:00.000Z&endDate=2026-01-01T00:00:00.000Z',
      )
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('accepts a valid custom range', async () => {
    const actor = await loginAs({ email: 'super6@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get(
        '/api/v1/dashboard/admin?range=CUSTOM&startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z',
      )
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.period.range).toBe('CUSTOM')
  })

  it('rejects an unrecognized timezone', async () => {
    const actor = await loginAs({ email: 'super7@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin?timezone=Not/AZone')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('accepts a valid IANA timezone, including a modern-preferred alias like Asia/Kolkata', async () => {
    const actor = await loginAs({ email: 'super8@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin?timezone=Asia/Kolkata')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.period.timezone).toBe('Asia/Kolkata')
  })

  it('rejects an unknown query parameter', async () => {
    const actor = await loginAs({ email: 'super9@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get('/api/v1/dashboard/admin?foo=bar')
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('rejects a custom range spanning more than 366 days', async () => {
    const actor = await loginAs({ email: 'super10@example.com', role: 'SUPER_ADMIN' })

    const res = await request(app)
      .get(
        '/api/v1/dashboard/admin?range=CUSTOM&startDate=2020-01-01T00:00:00.000Z&endDate=2026-01-01T00:00:00.000Z',
      )
      .set('Authorization', `Bearer ${actor.accessToken}`)

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/dashboard/admin — OpenAPI registration', () => {
  it('registers the dashboard path in the generated OpenAPI document', () => {
    const document = generateOpenApiDocument()
    expect(document.paths['/dashboard/admin']).toBeDefined()
  })
})
