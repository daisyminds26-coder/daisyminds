import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError, type ApiErrorDetail } from '../utils/api-error'

interface MongoDuplicateKeyError extends Error {
  code: number
  keyValue?: Record<string, unknown>
}

function isMongoDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    error instanceof Error &&
    error.name === 'MongoServerError' &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  )
}

function isBodyParserSyntaxError(error: unknown): error is SyntaxError & { type?: string } {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    (error as { type?: string }).type === 'entity.parse.failed'
  )
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: ApiErrorDetail[] = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }))
    return ApiError.validation('Validation failed', details)
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for field "${error.path}"`)
  }

  if (isMongoDuplicateKeyError(error)) {
    const field = error.keyValue ? Object.keys(error.keyValue)[0] : undefined
    return ApiError.conflict(
      field ? `A record with this ${field} already exists` : 'Duplicate record',
    )
  }

  if (isBodyParserSyntaxError(error)) {
    return ApiError.badRequest('Request body contains malformed JSON')
  }

  return ApiError.internal()
}

/**
 * Final middleware in the chain (4 arguments is what makes Express treat this
 * as an error handler). Every thrown/forwarded error — ApiError or otherwise —
 * lands here exactly once and is normalized into the API-STANDARDS.md §3
 * error envelope. Never exposes a stack trace or raw database error in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const apiError = normalizeError(err)

  if (apiError.statusCode >= 500) {
    logger.error({ err, requestId: req.requestId, path: req.path }, apiError.message)
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    code: apiError.code,
    ...(apiError.errors ? { errors: apiError.errors } : {}),
    ...(apiError.details ? { details: apiError.details } : {}),
    requestId: req.requestId,
    ...(env.isProduction ? {} : { stack: apiError.stack }),
  })
}
