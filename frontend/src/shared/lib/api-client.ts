import type { AxiosError } from 'axios'
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

import { ApiClientError, isApiClientError, type ApiErrorDetail } from '@/shared/lib/api-error'
import { useAuthSessionStore } from '@/shared/lib/auth-session-store'
import { broadcastAuthEvent } from '@/shared/lib/multi-tab-sync'

export interface ApiMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface SuccessEnvelope<T> {
  success: true
  message: string
  data: T
  meta?: ApiMeta
  requestId: string
}

interface ErrorEnvelope {
  success: false
  message: string
  code: string
  errors?: ApiErrorDetail[]
  details?: Record<string, unknown>
  requestId: string
}

const REQUEST_TIMEOUT_MS = 15_000

/**
 * Auth endpoints that never carry (or need) a Bearer token and must never
 * trigger the refresh-and-retry flow below — refreshing in response to a
 * 401 from `/auth/refresh` itself would recurse; refreshing in response to
 * a 401 from `/auth/login` would be nonsensical (SECURITY.md §1, §5).
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
]

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
}

let isLoggingOut = false

/** Set around the logout API call so a 401 raced during logout never triggers a refresh (spec: "do not refresh after logout"). */
export function setLoggingOut(value: boolean): void {
  isLoggingOut = value
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthSessionStore.getState()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  config.headers.set('X-Request-Id', crypto.randomUUID())
  return config
})

let refreshPromise: Promise<string> | null = null

async function performTokenRefresh(): Promise<string> {
  const response = await apiClient.post<SuccessEnvelope<{ accessToken: string }>>('/auth/refresh')
  const { accessToken } = response.data.data
  useAuthSessionStore.getState().setAccessToken(accessToken)
  useAuthSessionStore.getState().setStatus('authenticated')
  return accessToken
}

function getOrCreateRefreshPromise(): Promise<string> {
  refreshPromise ??= performTokenRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

function toApiClientError(
  status: number,
  envelope: Partial<ErrorEnvelope> | undefined,
): ApiClientError {
  return new ApiClientError({
    message: envelope?.message ?? 'Something went wrong. Please try again.',
    code: envelope?.code ?? 'UNKNOWN_ERROR',
    statusCode: status,
    errors: envelope?.errors,
    details: envelope?.details,
    requestId: envelope?.requestId,
  })
}

// Success responses are passed through unchanged (the full envelope, or a
// raw file for download-style endpoints) — `apiGet`/`apiPost`/etc. below
// are what unwrap `.data`/`.meta`, not this interceptor, so a paginated
// endpoint's `meta` is never silently discarded.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    if (!error.response) {
      return Promise.reject(
        error.code === 'ECONNABORTED'
          ? ApiClientError.timeoutError()
          : ApiClientError.networkError(),
      )
    }

    const { status, data } = error.response
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthPublicEndpoint = isPublicAuthRequest(config?.url)

    if (status === 401 && config && !isAuthPublicEndpoint && !config._retry && !isLoggingOut) {
      config._retry = true
      try {
        const newToken = await getOrCreateRefreshPromise()
        config.headers.set('Authorization', `Bearer ${newToken}`)
        return await apiClient(config)
      } catch (refreshError) {
        // Only a genuine 401 from /auth/refresh means the session itself is
        // actually gone (expired/revoked) — that's the one case logging the
        // user out is correct. Anything else (429 rate-limited, a 5xx, a
        // network blip) is a transient failure to *check* the session, not
        // proof it's invalid: tearing down a perfectly good session because
        // refresh got rate-limited was the actual bug here (a data-heavy
        // admin SPA with a few tabs open can legitimately burn through a
        // shared request budget). Reject with the refresh's own error and
        // leave the session alone so the next request can just try again.
        if (isApiClientError(refreshError) && refreshError.statusCode === 401) {
          useAuthSessionStore.getState().reset()
          broadcastAuthEvent('SESSION_INVALIDATED')
          return Promise.reject(
            new ApiClientError({
              message: 'Your session has expired. Please log in again.',
              code: 'SESSION_EXPIRED',
              statusCode: 401,
            }),
          )
        }
        return Promise.reject(
          refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
        )
      }
    }

    return Promise.reject(toApiClientError(status, data))
  },
)

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<SuccessEnvelope<T>>(url, config)
  return response.data.data
}

export interface PaginatedResult<T> {
  data: T[]
  meta: ApiMeta
}

/** For paginated list endpoints (API-STANDARDS.md §4) — returns both the page of items and the pagination `meta`. */
export async function apiGetPaginated<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<PaginatedResult<T>> {
  const response = await apiClient.get<SuccessEnvelope<T[]>>(url, config)
  if (!response.data.meta) {
    throw new Error(`Expected paginated response with meta from ${url}`)
  }
  return { data: response.data.data, meta: response.data.meta }
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<SuccessEnvelope<T>>(url, body, config)
  return response.data.data
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.put<SuccessEnvelope<T>>(url, body, config)
  return response.data.data
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.patch<SuccessEnvelope<T>>(url, body, config)
  return response.data.data
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<SuccessEnvelope<T>>(url, config)
  return response.data.data
}
