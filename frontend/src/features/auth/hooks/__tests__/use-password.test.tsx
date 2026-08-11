import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useChangePassword,
  useForgotPassword,
  useResetPassword,
} from '@/features/auth/hooks/use-password'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

describe('useForgotPassword', () => {
  it('returns a generic success response for any submitted email', async () => {
    const { result } = renderHook(() => useForgotPassword(), { wrapper })

    act(() => {
      result.current.mutate('nobody@example.com')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useResetPassword', () => {
  it('resets the password with a valid token', async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    act(() => {
      result.current.mutate({ token: 'valid-reset-token', newPassword: 'brand-new-password-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('rejects an invalid token with BAD_REQUEST', async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    act(() => {
      result.current.mutate({ token: 'garbage-token', newPassword: 'brand-new-password-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('BAD_REQUEST')
  })

  it('rejects an expired token with BAD_REQUEST', async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    act(() => {
      result.current.mutate({ token: 'expired-reset-token', newPassword: 'brand-new-password-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('BAD_REQUEST')
  })
})

describe('useChangePassword', () => {
  it('changes the password for an authenticated user', async () => {
    const queryClient = createTestQueryClient()
    function localWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result: loginResult } = renderHook(() => useLogin(), { wrapper: localWrapper })
    act(() => {
      loginResult.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
    })
    await waitFor(() => {
      expect(loginResult.current.isSuccess).toBe(true)
    })

    const { result } = renderHook(() => useChangePassword(), { wrapper: localWrapper })
    act(() => {
      result.current.mutate({
        currentPassword: 'correct-horse-1',
        newPassword: 'another-new-password-1',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
