import pinoHttp from 'pino-http'
import type { Request } from 'express'

import { logger } from '../config/logger'

/**
 * Logs one structured line per request: method, path, status code, and
 * response duration (pino-http's defaults). Request bodies are never
 * serialized here; headers are serialized but secrets are stripped by the
 * `redact` config on the base logger (config/logger.ts), not here.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
})
