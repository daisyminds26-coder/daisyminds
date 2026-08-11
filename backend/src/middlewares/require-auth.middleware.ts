import type { NextFunction, Request, Response } from 'express'

import { verifyAccessToken } from '../services/token.service'
import { ApiError } from '../utils/api-error'

const BEARER_PREFIX = 'Bearer '

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw ApiError.unauthorized('Authentication required')
  }

  const token = header.slice(BEARER_PREFIX.length).trim()
  req.user = verifyAccessToken(token)
  next()
}
