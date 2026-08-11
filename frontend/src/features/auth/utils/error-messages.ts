import { isApiClientError } from '@/shared/lib/api-error'

/**
 * Codes needing copy friendlier than the backend's own `message` (which is
 * otherwise already user-safe by design — SECURITY.md's login/forgot-password
 * messages are written to be shown as-is). Everything not listed here falls
 * through to `error.message` unchanged.
 */
const OVERRIDE_MESSAGES: Partial<Record<string, string>> = {
  NETWORK_ERROR: 'Unable to reach the server. Check your connection and try again.',
  TIMEOUT: 'The request took too long. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait a few minutes and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again shortly.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
}

/** Never renders a raw backend stack/internal message — always routes through this. */
export function getSafeErrorMessage(error: unknown): string {
  if (isApiClientError(error)) {
    return OVERRIDE_MESSAGES[error.code] ?? error.message
  }
  return 'An unexpected error occurred. Please try again.'
}
