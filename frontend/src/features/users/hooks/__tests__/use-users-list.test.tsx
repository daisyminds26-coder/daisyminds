import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUsersList } from '@/features/users/hooks/use-users-list'
import { resetUsersMockState } from '@/test/msw/handlers/users.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetUsersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useUsersList', () => {
  it('lists users with pagination meta', async () => {
    const { result } = renderHook(() => useUsersList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.data.length).toBeGreaterThanOrEqual(2)
    expect(result.current.data?.meta.total).toBeGreaterThanOrEqual(2)
  })

  it('filters by search', async () => {
    const { result } = renderHook(() => useUsersList({ page: 1, limit: 20, search: 'pending' }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.email).toBe('pending@example.com')
  })

  it('filters by status', async () => {
    const { result } = renderHook(() => useUsersList({ page: 1, limit: 20, status: 'ACTIVE' }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.data.every((user) => user.status === 'ACTIVE')).toBe(true)
  })
})
