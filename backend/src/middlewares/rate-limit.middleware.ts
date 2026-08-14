import rateLimit from 'express-rate-limit'

import { env } from '../config/env'
import { userOrIpKeyGenerator } from './rate-limit-key.util'
import { ApiError } from '../utils/api-error'

const SESSION_CHECK_PATHS = new Set([`${env.API_PREFIX}/auth/refresh`, `${env.API_PREFIX}/auth/me`])

/**
 * Global limiter applied to every route. Routed through the same error
 * envelope as everything else — express-rate-limit's own default response
 * is overridden via `handler` rather than left to send its own shape.
 *
 * `/auth/refresh` and `/auth/me` are excluded here — they're guarded by
 * their own, more generous `sessionCheckRateLimiter`
 * (auth-rate-limit.middleware.ts) instead. Neither belongs on the *shared*
 * budget with every other route: both are called automatically (page load,
 * every open tab, every 401-triggered retry) as part of completely normal
 * usage, both are gated by an already-issued credential rather than a
 * guessable one (so neither is brute-forceable the way login is), and the
 * whole app is stuck unable to render past a loading spinner without them
 * — so a data-heavy admin SPA with a few tabs open could exhaust the shared
 * 100-per-15-minute budget through completely legitimate traffic and take
 * the entire app down with it, not just one feature.
 *
 * Keyed by `userOrIpKeyGenerator` (user id when authenticated, IP
 * otherwise) rather than bare IP — this app's real users are frequently
 * behind a shared network (a classroom, a training center), and an IP-keyed
 * limiter would let one busy cohort throttle each other's independent,
 * legitimate usage.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  skip: (req) => SESSION_CHECK_PATHS.has(req.path),
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests())
  },
})
