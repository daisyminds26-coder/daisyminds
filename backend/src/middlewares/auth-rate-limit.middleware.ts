import rateLimit from 'express-rate-limit'

import { env } from '../config/env'
import { ApiError } from '../utils/api-error'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

/**
 * Tighter than the global limiter (API-STANDARDS.md §7, SECURITY.md §5) —
 * these guard the specific endpoints brute-force/enumeration attacks target.
 * Skipped entirely in the test environment: many integration tests exercise
 * repeated login/reset attempts deliberately (e.g. lockout behavior) against
 * the same in-process limiter store, which isn't what this middleware exists
 * to test.
 */
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: () => {
    throw ApiError.tooManyRequests()
  },
})

export const passwordResetRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: () => {
    throw ApiError.tooManyRequests()
  },
})
