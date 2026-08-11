import { randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Reuses an inbound `X-Request-Id` (e.g. set by Nginx or the frontend) so a
 * request can be traced end-to-end, otherwise mints a new one. Must run
 * before request-logger.middleware.ts so the correlation id is available
 * for every log line of this request.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER]
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()

  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
