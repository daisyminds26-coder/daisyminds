import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useActivateTrainer,
  useDeactivateTrainer,
  useSoftDeleteTrainer,
} from '@/features/trainers/hooks/use-trainer-lifecycle'
import { useBulkAction } from '@/features/trainers/hooks/use-bulk-action'
import { resetTrainersMockState } from '@/test/msw/handlers/trainers.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetTrainersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('trainer lifecycle mutations', () => {
  it('deactivates then reactivates a trainer', async () => {
    const { result: deactivate } = renderHook(() => useDeactivateTrainer(), { wrapper })
    act(() => {
      deactivate.current.mutate('trainer-1')
    })
    await waitFor(() => {
      expect(deactivate.current.isSuccess).toBe(true)
    })
    expect(deactivate.current.data?.status).toBe('DEACTIVATED')

    const { result: activate } = renderHook(() => useActivateTrainer(), { wrapper })
    act(() => {
      activate.current.mutate('trainer-1')
    })
    await waitFor(() => {
      expect(activate.current.isSuccess).toBe(true)
    })
    expect(activate.current.data?.status).toBe('ACTIVE')
  })

  it('soft-deletes a trainer', async () => {
    const { result } = renderHook(() => useSoftDeleteTrainer(), { wrapper })
    act(() => {
      result.current.mutate('trainer-1')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useBulkAction', () => {
  it('activates multiple trainers', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'activate', trainerIds: ['trainer-1', 'trainer-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.succeeded).toEqual(['trainer-1', 'trainer-2'])
  })

  it('reports a failure for an unknown id without throwing', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'deactivate', trainerIds: ['does-not-exist'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.failed).toHaveLength(1)
  })
})
