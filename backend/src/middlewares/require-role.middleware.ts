import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/api-error'

/** Must run after `requireAuth`. Role/permission checks never read `req.user.role` inline in a controller (API-STANDARDS.md §6). */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      throw ApiError.unauthorized('Authentication required')
    }

    if (!allowedRoles.includes(user.role)) {
      throw ApiError.forbidden()
    }

    next()
  }
}
