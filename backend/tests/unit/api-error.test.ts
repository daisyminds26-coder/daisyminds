import { describe, expect, it } from 'vitest'

import { ApiError } from '../../src/utils/api-error'

describe('ApiError', () => {
  it('notFound() produces a 404 with a stable code', () => {
    const error = ApiError.notFound('Student not found')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Student not found')
    expect(error).toBeInstanceOf(Error)
  })

  it('validation() carries field-level error details', () => {
    const error = ApiError.validation('Validation failed', [
      { field: 'email', message: 'must be a valid email' },
    ])
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.errors).toEqual([{ field: 'email', message: 'must be a valid email' }])
  })

  it.each([
    ['unauthorized', 401, 'UNAUTHORIZED'],
    ['forbidden', 403, 'FORBIDDEN'],
    ['conflict', 409, 'CONFLICT'],
    ['tooManyRequests', 429, 'RATE_LIMIT_EXCEEDED'],
    ['internal', 500, 'INTERNAL_SERVER_ERROR'],
    ['serviceUnavailable', 503, 'SERVICE_UNAVAILABLE'],
  ] as const)('%s() maps to status %d and code %s', (factory, statusCode, code) => {
    const error = ApiError[factory]()
    expect(error.statusCode).toBe(statusCode)
    expect(error.code).toBe(code)
  })
})
