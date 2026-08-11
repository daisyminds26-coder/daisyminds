import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useLogin } from '@/features/auth/hooks/use-login'
import { useLogout, useLogoutAll } from '@/features/auth/hooks/use-logout'
import { useAuthStore } from '@/features/auth/stores/auth-store'
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

describe('useLogout', () => {
  it('clears auth state and the query cache on logout', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = await renderLoggedIn(queryClient)
    queryClient.setQueryData(['some', 'other', 'cached', 'data'], { sensitive: true })

    const { result } = renderHook(() => useLogout(), { wrapper })
    act(() => {
      result.current.mutate()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(queryClient.getQueryData(['some', 'other', 'cached', 'data'])).toBeUndefined()
  })
})

describe('useLogoutAll', () => {
  it('clears local auth state after logging out of every device', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = await renderLoggedIn(queryClient)

    const { result } = renderHook(() => useLogoutAll(), { wrapper })
    act(() => {
      result.current.mutate()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
