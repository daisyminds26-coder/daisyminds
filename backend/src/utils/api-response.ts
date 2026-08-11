import type { Response } from 'express'

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  [key: string]: unknown
}

interface SendSuccessOptions<T> {
  data?: T
  message?: string
  meta?: ApiMeta
  statusCode?: number
}

/**
 * Builds the API-STANDARDS.md §3 success envelope. Controllers call this
 * instead of `res.json(...)` directly, so the shape can never drift per-route.
 */
export function sendSuccess<T>(res: Response, options: SendSuccessOptions<T> = {}): void {
  const { data, message = 'Request completed successfully', meta, statusCode = 200 } = options

  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
    requestId: res.req.requestId,
  })
}

export function sendCreated<T>(
  res: Response,
  options: Omit<SendSuccessOptions<T>, 'statusCode'> = {},
): void {
  sendSuccess(res, { ...options, statusCode: 201 })
}

export function sendNoContent(res: Response): void {
  res.status(204).end()
}
