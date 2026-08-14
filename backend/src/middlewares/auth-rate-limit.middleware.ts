import rateLimit from 'express-rate-limit'

import { env } from '../config/env'
import { userOrIpKeyGenerator } from './rate-limit-key.util'
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

const ONE_MINUTE_MS = 60 * 1000

/**
 * Shared by `/auth/refresh` and `/auth/me` — the app's own session
 * bootstrapping calls, not a feature request. Deliberately much more
 * generous than `loginRateLimiter`: both are gated by an already-issued
 * credential (an httpOnly cookie for refresh, a Bearer access token for
 * `/me`) an attacker can't guess, so neither is a brute-force target the
 * way login is, and both are called automatically as routine, unavoidable
 * app usage (every page load, every open tab, every 401-triggered retry) —
 * the whole app is stuck on a loading screen without them. One shared
 * instance (not two separate ones) is intentional: it's a single "can this
 * client keep proving who it is" budget, not two independent ones to
 * separately exhaust. Still bounds genuine abuse (e.g. a compromised token
 * being hammered) without routine use ever getting near the limit.
 */
export const sessionCheckRateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  skip: () => env.isTest,
  handler: () => {
    throw ApiError.tooManyRequests()
  },
})
