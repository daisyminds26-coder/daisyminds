import { StrictMode } from 'react'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthBootstrap } from '@/features/auth/hooks/use-auth-bootstrap'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { resetAuthMockState, setRefreshOutcome } from '@/test/msw/handlers/auth.handlers'
import { TEST_API_BASE_URL } from '@/test/api-base-url'
import { server } from '@/test/msw/server'
import { resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

describe('useAuthBootstrap', () => {
  it('restores an authenticated session when the refresh cookie is valid', async () => {
    // Simulate an existing session the way `resetAuthMockState` can't: the
    // mock refresh handler only succeeds once a "session" exists, so this
    // test's contract is the inverse of the failure case below.
    setRefreshOutcome('success')
    // The mock refresh handler requires `sessionEmail` to be set to succeed
    // (mirroring "a valid httpOnly cookie exists"); logging in first is the
    // simplest way to reach that state without reaching into module internals.
    const { login } = await import('@/features/auth/api/auth.api')
    await login('active@example.com', 'correct-horse-1')

    renderHook(() => {
      useAuthBootstrap()
    })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('authenticated')
    })
    expect(useAuthStore.getState().accessToken).toEqual(expect.any(String))
  })

  it('sets status to unauthenticated when there is no valid session', async () => {
    setRefreshOutcome('unauthorized')

    renderHook(() => {
      useAuthBootstrap()
    })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('still resolves to unauthenticated under React StrictMode (dev-only mount→cleanup→remount)', async () => {
    // `main.tsx` wraps the app in `<StrictMode>`, which deliberately double-
    // invokes effects in development (mount, cleanup, mount again) to catch
    // missing-cleanup bugs. Reproduces the real stuck-spinner report: the
    // `hasRun` ref guard alone is not enough if the effect body still races
    // an in-flight promise against its own cleanup.
    setRefreshOutcome('unauthorized')

    renderHook(
      () => {
        useAuthBootstrap()
      },
      { wrapper: StrictMode },
    )

    await waitFor(
      () => {
        expect(useAuthStore.getState().status).toBe('unauthenticated')
      },
      { timeout: 2000 },
    )
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('performs exactly one network call to /auth/refresh even under StrictMode', async () => {
    setRefreshOutcome('unauthorized')
    const { getRefreshCallCount } = await import('@/test/msw/handlers/auth.handlers')

    renderHook(
      () => {
        useAuthBootstrap()
      },
      { wrapper: StrictMode },
    )

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
    expect(getRefreshCallCount()).toBe(1)
  })

  it('resolves to unauthenticated (not a permanent spinner) when the refresh call hits a network error', async () => {
    server.use(http.post(`${TEST_API_BASE_URL}/auth/refresh`, () => HttpResponse.error()))
    // A network failure is genuinely unexpected — bootstrap logs it, which
    // would otherwise fail this test under the default `console.error` spy.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderHook(() => {
      useAuthBootstrap()
    })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
