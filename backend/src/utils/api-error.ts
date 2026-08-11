export interface ApiErrorDetail {
  field: string
  message: string
}

/**
 * Base for every domain/business error. Thrown from anywhere in the request
 * lifecycle; `middlewares/error-handler.middleware.ts` is the single place
 * that turns it into the API-STANDARDS.md §3 error envelope.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly errors?: ApiErrorDetail[],
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    Error.captureStackTrace(this, new.target)
  }

  static badRequest(message = 'Bad request', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', errors)
  }

  static validation(message = 'Validation failed', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(message, 400, 'VALIDATION_ERROR', errors)
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED')
  }

  /**
   * Distinct from `unauthorized()` so the frontend can branch on `code`
   * rather than parsing `message` (API-STANDARDS.md §3) to show a dedicated
   * "temporarily locked" state. `lockedUntil` lets it display a real
   * retry-after time instead of just the static message.
   */
  static locked(message: string, lockedUntil: Date): ApiError {
    return new ApiError(message, 401, 'ACCOUNT_LOCKED', undefined, {
      lockedUntil: lockedUntil.toISOString(),
    })
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN')
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND')
  }

  static conflict(message = 'Resource conflict'): ApiError {
    return new ApiError(message, 409, 'CONFLICT')
  }

  static unprocessable(
    message = 'Request could not be processed',
    errors?: ApiErrorDetail[],
  ): ApiError {
    return new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', errors)
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ApiError {
    return new ApiError(message, 429, 'RATE_LIMIT_EXCEEDED')
  }

  static internal(message = 'An unexpected error occurred'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_SERVER_ERROR')
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(message, 503, 'SERVICE_UNAVAILABLE')
  }
}
