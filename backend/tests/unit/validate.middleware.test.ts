import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { errorHandler } from '../../src/middlewares/error-handler.middleware'
import { requestId } from '../../src/middlewares/request-id.middleware'
import { validate } from '../../src/middlewares/validate.middleware'

const bodySchema = z
  .object({
    email: z.email(),
    age: z.coerce.number().int().positive(),
  })
  .strict()

const querySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
  })
  .strict()

function buildTestApp(): express.Express {
  const app = express()
  app.use(express.json())
  app.use(requestId)

  app.post('/students', validate({ body: bodySchema, query: querySchema }), (req, res) => {
    res.status(200).json({ received: req.validated?.body, query: req.validated?.query })
  })

  app.use(errorHandler)
  return app
}

describe('validate.middleware', () => {
  it('passes through valid input and stores the parsed result on req.validated', async () => {
    const testApp = buildTestApp()

    const res = await request(testApp)
      .post('/students?page=2')
      .send({ email: 'student@example.com', age: '21' })

    expect(res.status).toBe(200)
    expect(res.body.received).toEqual({ email: 'student@example.com', age: 21 })
    expect(res.body.query).toEqual({ page: 2 })
  })

  it('rejects an invalid body with a 400 VALIDATION_ERROR envelope', async () => {
    const testApp = buildTestApp()

    const res = await request(testApp).post('/students').send({ email: 'not-an-email', age: -5 })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(res.body.errors.length).toBeGreaterThan(0)
    expect(res.body.errors.some((e: { field: string }) => e.field === 'email')).toBe(true)
  })

  it('rejects an unknown field the schema does not define', async () => {
    const testApp = buildTestApp()

    const res = await request(testApp)
      .post('/students')
      .send({ email: 'student@example.com', age: 21, isAdmin: true })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })
})
