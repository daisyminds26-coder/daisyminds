import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useActivateUser,
  useDeactivateUser,
  useSoftDeleteUser,
} from '@/features/users/hooks/use-user-lifecycle'
import { useAssignRole } from '@/features/users/hooks/use-assign-role'
import { useBulkAction } from '@/features/users/hooks/use-bulk-action'
import { resetUsersMockState } from '@/test/msw/handlers/users.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetUsersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('user lifecycle mutations', () => {
  it('deactivates then reactivates a user', async () => {
    const { result: deactivate } = renderHook(() => useDeactivateUser(), { wrapper })
    act(() => {
      deactivate.current.mutate('user-1')
    })
    await waitFor(() => {
      expect(deactivate.current.isSuccess).toBe(true)
    })
    expect(deactivate.current.data?.status).toBe('DEACTIVATED')

    const { result: activate } = renderHook(() => useActivateUser(), { wrapper })
    act(() => {
      activate.current.mutate('user-1')
    })
    await waitFor(() => {
      expect(activate.current.isSuccess).toBe(true)
    })
    expect(activate.current.data?.status).toBe('ACTIVE')
  })

  it('soft-deletes a user', async () => {
    const { result } = renderHook(() => useSoftDeleteUser(), { wrapper })
    act(() => {
      result.current.mutate('user-1')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useAssignRole', () => {
  it("changes a user's role", async () => {
    const { result } = renderHook(() => useAssignRole('user-1'), { wrapper })
    act(() => {
      result.current.mutate('role-trainer')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.role).toBe('TRAINER')
  })
})

describe('useBulkAction', () => {
  it('activates multiple users', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'activate', userIds: ['user-1', 'user-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.succeeded).toEqual(['user-1', 'user-2'])
  })

  it('reports a failure for an unknown id without throwing', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'deactivate', userIds: ['does-not-exist'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.failed).toHaveLength(1)
  })
})
