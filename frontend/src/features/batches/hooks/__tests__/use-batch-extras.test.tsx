import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useBatch } from '@/features/batches/hooks/use-batch'
import { useBatchStats } from '@/features/batches/hooks/use-batch-stats'
import { useBatchReadiness } from '@/features/batches/hooks/use-batch-readiness'
import { useBatchConflicts } from '@/features/batches/hooks/use-batch-conflicts'
import { useAssignTrainers } from '@/features/batches/hooks/use-assign-trainers'
import { useDuplicateBatch } from '@/features/batches/hooks/use-duplicate-batch'
import { useAuditLog } from '@/features/batches/hooks/use-audit-log'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetBatchesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useBatch', () => {
  it('loads a single batch by id', async () => {
    const { result } = renderHook(() => useBatch('batch-2'), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.name).toBe('September 2026 Evening Batch')
  })
})

describe('useBatchStats', () => {
  it('reports counts by status without ever exposing an enrollment figure', async () => {
    const { result } = renderHook(() => useBatchStats(), { wrapper })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.total).toBe(2)
    expect(result.current.scheduled).toBe(1)
    expect(result.current).not.toHaveProperty('enrolled')
    expect(result.current).not.toHaveProperty('availableSeats')
  })
})

describe('useBatchReadiness', () => {
  it('reports not-ready with blockers for a batch missing a trainer and timetable', async () => {
    const { result } = renderHook(() => useBatchReadiness('batch-1'), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.ready).toBe(false)
    expect(result.current.data?.blockers.length).toBeGreaterThan(0)
  })

  it('reports ready for a fully configured batch', async () => {
    const { result } = renderHook(() => useBatchReadiness('batch-2'), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.ready).toBe(true)
  })
})

describe('useBatchConflicts', () => {
  it('distinguishes AVAILABILITY and CROSS_BATCH conflict types', async () => {
    const { result } = renderHook(() => useBatchConflicts('batch-2'), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    const types = result.current.data?.map((conflict) => conflict.type)
    expect(types).toContain('AVAILABILITY')
    expect(types).toContain('CROSS_BATCH')
  })

  it('reports no conflicts for a batch without seeded conflicts', async () => {
    const { result } = renderHook(() => useBatchConflicts('batch-1'), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toEqual([])
  })
})

describe('useAssignTrainers', () => {
  it('updates the primary and assistant trainers', async () => {
    const { result } = renderHook(() => useAssignTrainers('batch-1'), { wrapper })
    act(() => {
      result.current.mutate({ primaryTrainerId: 'trainer-1', assistantTrainerIds: ['trainer-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.primaryTrainerId).toBe('trainer-1')
    expect(result.current.data?.assistantTrainerIds).toEqual(['trainer-2'])
  })
})

describe('useDuplicateBatch', () => {
  it('creates a new DRAFT batch from an existing one', async () => {
    const { result } = renderHook(() => useDuplicateBatch('batch-2'), { wrapper })
    act(() => {
      result.current.mutate({ name: 'Duplicated Batch' })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.name).toBe('Duplicated Batch')
    expect(result.current.data?.status).toBe('DRAFT')
    expect(result.current.data?.id).not.toBe('batch-2')
  })
})

describe('useAuditLog (batches)', () => {
  it('loads an empty audit log page', async () => {
    const { result } = renderHook(() => useAuditLog('batch-1', 1), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.data).toEqual([])
  })
})
