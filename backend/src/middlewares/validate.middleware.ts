import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

import { ApiError } from '../utils/api-error'
import type { ValidatedRequestData } from '../types/express'

export interface ValidationSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

/**
 * Validates the given parts of the request against their Zod schema and
 * stores the parsed/coerced result on `req.validated` — never reassigns
 * `req.query` directly, since Express 5 makes it a read-only getter.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validated: ValidatedRequestData = {}

    for (const key of Object.keys(schemas) as (keyof ValidationSchemas)[]) {
      const schema = schemas[key]
      if (!schema) continue

      const result = schema.safeParse(req[key])
      if (!result.success) {
        throw ApiError.validation(
          `Invalid request ${key}`,
          result.error.issues.map((issue) => ({
            field: issue.path.length > 0 ? issue.path.join('.') : key,
            message: issue.message,
          })),
        )
      }

      validated[key] = result.data
    }

    req.validated = validated
    next()
  }
}
