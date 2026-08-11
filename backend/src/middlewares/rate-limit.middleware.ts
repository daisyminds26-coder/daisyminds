import rateLimit from 'express-rate-limit'

import { env } from '../config/env'
import { ApiError } from '../utils/api-error'

/**
 * Global limiter applied to every route. Routed through the same error
 * envelope as everything else — express-rate-limit's own default response
 * is overridden via `handler` rather than left to send its own shape.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests())
  },
})
