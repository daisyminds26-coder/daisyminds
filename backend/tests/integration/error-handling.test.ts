import express from 'express'
import mongoose from 'mongoose'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { errorHandler } from '../../src/middlewares/error-handler.middleware'
import { notFoundHandler } from '../../src/middlewares/not-found.middleware'
import { requestId } from '../../src/middlewares/request-id.middleware'
import { ApiError } from '../../src/utils/api-error'

describe('unknown routes', () => {
  it('returns a 404 error envelope for an unmatched route', async () => {
    const res = await request(app).get('/api/v1/this-route-does-not-exist')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      success: false,
      code: 'NOT_FOUND',
    })
    expect(typeof res.body.message).toBe('string')
    expect(typeof res.body.requestId).toBe('string')
  })
})

describe('security headers', () => {
  it('sets Helmet security headers', async () => {
    const res = await request(app).get('/api/v1/health/live')

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers).toHaveProperty('x-dns-prefetch-control')
  })

  it('echoes a request id header', async () => {
    const res = await request(app).get('/api/v1/health/live')

    expect(res.headers['x-request-id']).toBeTruthy()
  })
})

describe('CORS', () => {
  it('allows a whitelisted origin', async () => {
    const res = await request(app).get('/api/v1/health/live').set('Origin', 'http://localhost:5173')

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('does not grant CORS headers to a non-whitelisted origin', async () => {
    const res = await request(app)
      .get('/api/v1/health/live')
      .set('Origin', 'http://evil.example.com')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('error-handler.middleware mapping', () => {
  function buildTestApp(routeHandler: express.RequestHandler): express.Express {
    const testApp = express()
    testApp.use(requestId)
    testApp.get('/throw', routeHandler)
    testApp.use(notFoundHandler)
    testApp.use(errorHandler)
    return testApp
  }

  it('maps ApiError to its declared status and code', async () => {
    const testApp = buildTestApp(() => {
      throw ApiError.forbidden('Nope')
    })

    const res = await request(testApp).get('/throw')

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN', message: 'Nope' })
  })

  it('maps a Mongoose ValidationError to 400 VALIDATION_ERROR with field details', async () => {
    const testApp = buildTestApp(async () => {
      const Model = mongoose.model(
        `TestModel_${String(Date.now())}`,
        new mongoose.Schema({ name: { type: String, required: true } }),
      )
      const doc = new Model({})
      await doc.validate()
    })

    const res = await request(testApp).get('/throw')

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors[0].field).toBe('name')
  })

  it('maps a MongoDB duplicate-key error to 409 CONFLICT', async () => {
    const testApp = buildTestApp(() => {
      const duplicateError = new Error('duplicate key') as Error & {
        name: string
        code: number
        keyValue: Record<string, unknown>
      }
      duplicateError.name = 'MongoServerError'
      duplicateError.code = 11000
      duplicateError.keyValue = { email: 'test@example.com' }
      throw duplicateError
    })

    const res = await request(testApp).get('/throw')

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('maps an unrecognized error to a safe 500 without leaking internals', async () => {
    const testApp = buildTestApp(() => {
      throw new Error('some internal database secret detail')
    })

    const res = await request(testApp).get('/throw')

    expect(res.status).toBe(500)
    expect(res.body.code).toBe('INTERNAL_SERVER_ERROR')
    expect(res.body.message).not.toContain('internal database secret detail')
  })

  it('rejects malformed JSON bodies with a clean 400', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{ not valid json')

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
