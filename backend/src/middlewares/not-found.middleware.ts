import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/api-error'

/**
 * Mounted after every route — anything that reaches here matched no route.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}
