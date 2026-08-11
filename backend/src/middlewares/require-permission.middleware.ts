import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/api-error'

/** Must run after `requireAuth`. Permissions are a snapshot embedded in the access token at issuance — see types/auth.ts. */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      throw ApiError.unauthorized('Authentication required')
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    )

    if (!hasAllPermissions) {
      throw ApiError.forbidden()
    }

    next()
  }
}
