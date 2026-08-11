import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useResendVerification, useVerifyEmail } from '@/features/auth/hooks/use-email-verification'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

describe('useVerifyEmail', () => {
  it('verifies successfully with a valid token', async () => {
    const { result } = renderHook(() => useVerifyEmail(), { wrapper })

    act(() => {
      result.current.mutate('valid-verify-token')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('rejects an invalid/expired token with BAD_REQUEST', async () => {
    const { result } = renderHook(() => useVerifyEmail(), { wrapper })

    act(() => {
      result.current.mutate('garbage-token')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('BAD_REQUEST')
  })
})

describe('useResendVerification', () => {
  it('returns a generic success response regardless of the email', async () => {
    const { result } = renderHook(() => useResendVerification(), { wrapper })

    act(() => {
      result.current.mutate('anyone@example.com')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
