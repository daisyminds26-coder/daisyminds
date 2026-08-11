import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

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

describe('useLogin', () => {
  it('logs in successfully with correct credentials for an ACTIVE account', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.user.email).toBe('active@example.com')
    expect(result.current.data?.accessToken).toEqual(expect.any(String))
  })

  it('rejects invalid credentials with a generic UNAUTHORIZED error', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'active@example.com', password: 'wrong-password' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('UNAUTHORIZED')
    expect(result.current.error?.statusCode).toBe(401)
  })

  it('rejects a LOCKED account with ACCOUNT_LOCKED and a lockedUntil detail', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'locked@example.com', password: 'correct-horse-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('ACCOUNT_LOCKED')
    expect(result.current.error?.statusCode).toBe(401)
    expect(result.current.error?.details?.lockedUntil).toEqual(expect.any(String))
  })

  it('rejects a PENDING_VERIFICATION account with EMAIL_NOT_VERIFIED', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'pending@example.com', password: 'correct-horse-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('EMAIL_NOT_VERIFIED')
    expect(result.current.error?.statusCode).toBe(403)
  })

  it('rejects a SUSPENDED account with FORBIDDEN', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'suspended@example.com', password: 'correct-horse-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('FORBIDDEN')
    expect(result.current.error?.statusCode).toBe(403)
  })

  it('rejects a DEACTIVATED account with the same generic message as invalid credentials', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'deactivated@example.com', password: 'correct-horse-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('UNAUTHORIZED')
    expect(result.current.error?.message).toBe('Invalid email or password')
  })
})
