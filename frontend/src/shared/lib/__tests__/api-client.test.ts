import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { login } from '@/features/auth/api/auth.api'
import { apiClient, apiGet } from '@/shared/lib/api-client'
import { isApiClientError } from '@/shared/lib/api-error'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import {
  expireAccessToken,
  getRefreshCallCount,
  resetAuthMockState,
  setRefreshOutcome,
} from '@/test/msw/handlers/auth.handlers'
import { TEST_API_BASE_URL } from '@/test/api-base-url'
import { server } from '@/test/msw/server'
import { resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

describe('apiClient refresh-and-retry', () => {
  it('transparently refreshes and retries a request whose access token has expired', async () => {
    const loginResult = await login('active@example.com', 'correct-horse-1')
    useAuthStore.getState().setAccessToken(loginResult.accessToken)
    expireAccessToken(loginResult.accessToken)

    const user = await apiGet<{ email: string }>('/auth/me')

    expect(user.email).toBe('active@example.com')
    expect(useAuthStore.getState().accessToken).not.toBe(loginResult.accessToken)
  })

  it('deduplicates concurrent refreshes into a single network call', async () => {
    const loginResult = await login('active@example.com', 'correct-horse-1')
    useAuthStore.getState().setAccessToken(loginResult.accessToken)
    expireAccessToken(loginResult.accessToken)

    const before = getRefreshCallCount()
    await Promise.all([apiGet('/auth/me'), apiGet('/auth/me'), apiGet('/auth/me')])
    const after = getRefreshCallCount()

    expect(after - before).toBe(1)
  })

  it('clears auth state and does not loop when the refresh call itself fails', async () => {
    const loginResult = await login('active@example.com', 'correct-horse-1')
    useAuthStore.getState().setAccessToken(loginResult.accessToken)
    expireAccessToken(loginResult.accessToken)
    setRefreshOutcome('unauthorized')

    const before = getRefreshCallCount()
    await expect(apiGet('/auth/me')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' })
    const after = getRefreshCallCount()

    expect(after - before).toBe(1)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('does not attempt a refresh for a 403 response', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/forbidden-resource`, () =>
        HttpResponse.json(
          { success: false, message: 'Forbidden', code: 'FORBIDDEN', requestId: 'req-1' },
          { status: 403 },
        ),
      ),
    )
    const before = getRefreshCallCount()

    await expect(apiGet('/forbidden-resource')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    })
    expect(getRefreshCallCount()).toBe(before)
  })

  it('does not recursively attempt to refresh a 401 from /auth/refresh itself', async () => {
    setRefreshOutcome('unauthorized')
    const before = getRefreshCallCount()

    const { refresh } = await import('@/features/auth/api/auth.api')
    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })

    // Exactly the one direct call this test made — a real recursive-refresh
    // bug would show up as 2+ (the interceptor treating /auth/refresh's own
    // 401 as "access token expired" and calling /auth/refresh again to fix it).
    expect(getRefreshCallCount() - before).toBe(1)
  })

  it('maps a connection failure to a NETWORK_ERROR with no status code', async () => {
    server.use(http.get(`${TEST_API_BASE_URL}/unreachable`, () => HttpResponse.error()))

    const error = await apiGet('/unreachable').catch((caught: unknown) => caught)

    expect(isApiClientError(error)).toBe(true)
    if (isApiClientError(error)) {
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.statusCode).toBeNull()
    }
  })

  it('sends a unique X-Request-Id header on every request', async () => {
    const capturedHeaders: string[] = []
    server.use(
      http.get(`${TEST_API_BASE_URL}/echo-request-id`, ({ request }) => {
        const id = request.headers.get('x-request-id')
        if (id) capturedHeaders.push(id)
        return HttpResponse.json({ success: true, message: 'ok', data: null, requestId: 'x' })
      }),
    )

    await apiClient.get('/echo-request-id')
    await apiClient.get('/echo-request-id')

    expect(capturedHeaders).toHaveLength(2)
    expect(capturedHeaders[0]).not.toBe(capturedHeaders[1])
  })
})
