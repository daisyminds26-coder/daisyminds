import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { app } from '../../src/app'

describe('GET /api/v1/health/live', () => {
  it('confirms the process is running', async () => {
    const res = await request(app).get('/api/v1/health/live')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(typeof res.body.data.uptime).toBe('number')
  })
})

describe('GET /api/v1/health/ready', () => {
  it('reports unavailable when Mongo/Redis are not connected (no real infra in tests)', async () => {
    const res = await request(app).get('/api/v1/health/ready')

    expect(res.status).toBe(503)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('unavailable')
    expect(res.body.data.dependencies.database.status).toBe('unavailable')
    expect(res.body.data.dependencies.redis.status).toBe('unavailable')
  })
})

describe('GET /api/v1/health', () => {
  it('returns application metadata and dependency status', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Daisy Minds LMS API')
    expect(res.body.data.environment).toBe('test')
    expect(res.body.data.version).toBe('1.0.0')
    expect(typeof res.body.data.uptime).toBe('number')
    expect(res.body.data.dependencies).toBeDefined()
  })

  it('never exposes credentials or connection strings', async () => {
    const res = await request(app).get('/api/v1/health')

    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain('mongodb://')
    expect(raw).not.toContain('test-secret')
  })
})
