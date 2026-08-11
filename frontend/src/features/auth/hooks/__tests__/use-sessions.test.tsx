import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useLogin } from '@/features/auth/hooks/use-login'
import { useRevokeSession, useSessions } from '@/features/auth/hooks/use-sessions'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

async function renderLoggedIn(queryClient: QueryClient) {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result: login } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    login.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(login.current.isSuccess).toBe(true)
  })
  return wrapper
}

describe('useSessions', () => {
  it('lists the current sessions once authenticated', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = await renderLoggedIn(queryClient)

    const { result } = renderHook(() => useSessions(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(result.current.data?.some((session) => session.isCurrent)).toBe(true)
  })
})

describe('useRevokeSession', () => {
  it('removes a revoked non-current session from the cache', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = await renderLoggedIn(queryClient)

    const { result: sessions } = renderHook(() => useSessions(), { wrapper })
    await waitFor(() => {
      expect(sessions.current.isSuccess).toBe(true)
    })
    const otherSession = sessions.current.data?.find((session) => !session.isCurrent)
    expect(otherSession).toBeDefined()

    const { result: revoke } = renderHook(() => useRevokeSession(), { wrapper })
    act(() => {
      revoke.current.mutate(otherSession?.id ?? '')
    })

    await waitFor(() => {
      expect(revoke.current.isSuccess).toBe(true)
    })

    const cached = queryClient.getQueryData<{ id: string }[]>(['auth', 'sessions'])
    expect(cached?.some((session) => session.id === otherSession?.id)).toBe(false)
  })

  it('returns 404 (not 403) when revoking a session id that is not owned', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = await renderLoggedIn(queryClient)

    const { result } = renderHook(() => useRevokeSession(), { wrapper })
    act(() => {
      result.current.mutate('not-owned-session')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.statusCode).toBe(404)
  })
})
