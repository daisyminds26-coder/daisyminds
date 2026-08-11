import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useBatchesList } from '@/features/batches/hooks/use-batches-list'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetBatchesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useBatchesList', () => {
  it('loads the seeded batches with pagination meta', async () => {
    const { result } = renderHook(() => useBatchesList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(2)
    expect(result.current.data?.meta.total).toBe(2)
  })

  it('filters by status', async () => {
    const { result } = renderHook(
      () => useBatchesList({ page: 1, limit: 20, status: 'SCHEDULED' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.status).toBe('SCHEDULED')
  })

  it('searches by name', async () => {
    const { result } = renderHook(
      () => useBatchesList({ page: 1, limit: 20, search: 'September' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.name).toBe('September 2026 Evening Batch')
  })

  it('includes real occupiedSeats/availableSeats (Phase 10B Part 2) but never a waitlist count on the list row', async () => {
    const { result } = renderHook(() => useBatchesList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const row = result.current.data?.data[0]
    expect(row).toHaveProperty('occupiedSeats')
    expect(row).toHaveProperty('availableSeats')
    expect(row).not.toHaveProperty('enrolledCount')
    expect(row).not.toHaveProperty('waitlistCount')
  })
})
