import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateUser } from '@/features/users/hooks/use-create-user'
import { resetUsersMockState } from '@/test/msw/handlers/users.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetUsersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useCreateUser', () => {
  it('creates a user as PENDING_VERIFICATION by default', async () => {
    const { result } = renderHook(() => useCreateUser(), { wrapper })

    act(() => {
      result.current.mutate({
        email: 'newbie@example.com',
        password: 'correct-horse-1',
        roleId: 'role-student',
        sendVerificationEmail: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('PENDING_VERIFICATION')
  })

  it('rejects a duplicate email', async () => {
    const { result } = renderHook(() => useCreateUser(), { wrapper })

    act(() => {
      result.current.mutate({
        email: 'active@example.com',
        password: 'correct-horse-1',
        roleId: 'role-student',
        sendVerificationEmail: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.code).toBe('CONFLICT')
  })
})
