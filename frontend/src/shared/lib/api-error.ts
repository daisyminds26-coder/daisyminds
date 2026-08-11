export interface ApiErrorDetail {
  field: string
  message: string
}

interface ApiClientErrorOptions {
  message: string
  code: string
  statusCode: number | null
  errors?: ApiErrorDetail[]
  details?: Record<string, unknown>
  requestId?: string
}

/**
 * Client-side mirror of the backend's `ApiError` (API-STANDARDS.md §3) plus
 * a `statusCode: null` case for network/timeout failures that never reached
 * the server (no envelope exists to parse). Every rejected `apiClient` call
 * rejects with this type — callers branch on `code`/`statusCode`, never on
 * `message` text.
 */
export class ApiClientError extends Error {
  readonly code: string
  readonly statusCode: number | null
  readonly errors?: ApiErrorDetail[]
  readonly details?: Record<string, unknown>
  readonly requestId?: string

  constructor(options: ApiClientErrorOptions) {
    super(options.message)
    this.name = 'ApiClientError'
    this.code = options.code
    this.statusCode = options.statusCode
    this.errors = options.errors
    this.details = options.details
    this.requestId = options.requestId
  }

  get isNetworkError(): boolean {
    return this.statusCode === null
  }

  static networkError(): ApiClientError {
    return new ApiClientError({
      message: 'Unable to reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
      statusCode: null,
    })
  }

  static timeoutError(): ApiClientError {
    return new ApiClientError({
      message: 'The request took too long. Please try again.',
      code: 'TIMEOUT',
      statusCode: null,
    })
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}
