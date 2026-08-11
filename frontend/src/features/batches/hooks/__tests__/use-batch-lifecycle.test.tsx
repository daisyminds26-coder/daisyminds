import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useActivateBatch,
  useArchiveBatch,
  useCancelBatch,
  useCompleteBatch,
  useRestoreBatch,
  useScheduleBatch,
  useSoftDeleteBatch,
  useUnscheduleBatch,
} from '@/features/batches/hooks/use-batch-lifecycle'
import { useUpdateBatch } from '@/features/batches/hooks/use-update-batch'
import { useBulkAction } from '@/features/batches/hooks/use-bulk-action'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { createTestQueryClient } from '@/test/test-utils'
import { isApiClientError } from '@/shared/lib/api-error'

beforeEach(() => {
  resetBatchesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('batch lifecycle mutations', () => {
  it('schedule is rejected with readiness blockers when the batch has no trainer or timetable', async () => {
    const { result } = renderHook(() => useScheduleBatch(), { wrapper })
    act(() => {
      result.current.mutate('batch-1')
    })
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(isApiClientError(result.current.error) && result.current.error.statusCode).toBe(422)
  })

  it('schedules a batch once readiness blockers are resolved', async () => {
    const { result: update } = renderHook(() => useUpdateBatch('batch-1'), { wrapper })
    act(() => {
      update.current.mutate({
        primaryTrainerId: 'trainer-1',
        weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' }],
      })
    })
    await waitFor(() => {
      expect(update.current.isSuccess).toBe(true)
    })

    const { result: schedule } = renderHook(() => useScheduleBatch(), { wrapper })
    act(() => {
      schedule.current.mutate('batch-1')
    })
    await waitFor(() => {
      expect(schedule.current.isSuccess).toBe(true)
    })
    expect(schedule.current.data?.status).toBe('SCHEDULED')
  })

  it('unschedules a scheduled batch back to draft', async () => {
    const { result } = renderHook(() => useUnscheduleBatch(), { wrapper })
    act(() => {
      result.current.mutate('batch-2')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('DRAFT')
  })

  it('activates a scheduled batch then completes it', async () => {
    const { result: activate } = renderHook(() => useActivateBatch(), { wrapper })
    act(() => {
      activate.current.mutate('batch-2')
    })
    await waitFor(() => {
      expect(activate.current.isSuccess).toBe(true)
    })
    expect(activate.current.data?.status).toBe('ACTIVE')

    const { result: complete } = renderHook(() => useCompleteBatch(), { wrapper })
    act(() => {
      complete.current.mutate('batch-2')
    })
    await waitFor(() => {
      expect(complete.current.isSuccess).toBe(true)
    })
    expect(complete.current.data?.status).toBe('COMPLETED')
  })

  it('cancels a batch', async () => {
    const { result } = renderHook(() => useCancelBatch(), { wrapper })
    act(() => {
      result.current.mutate('batch-2')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('CANCELLED')
  })

  it('archives then restores a batch', async () => {
    const { result: archive } = renderHook(() => useArchiveBatch(), { wrapper })
    act(() => {
      archive.current.mutate('batch-1')
    })
    await waitFor(() => {
      expect(archive.current.isSuccess).toBe(true)
    })
    expect(archive.current.data?.status).toBe('ARCHIVED')

    const { result: restore } = renderHook(() => useRestoreBatch(), { wrapper })
    act(() => {
      restore.current.mutate('batch-1')
    })
    await waitFor(() => {
      expect(restore.current.isSuccess).toBe(true)
    })
    expect(restore.current.data?.status).toBe('DRAFT')
  })

  it('soft-deletes a batch', async () => {
    const { result } = renderHook(() => useSoftDeleteBatch(), { wrapper })
    act(() => {
      result.current.mutate('batch-1')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useBulkAction (batches)', () => {
  it('archives multiple batches', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'archive', batchIds: ['batch-1', 'batch-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.succeeded).toEqual(['batch-1', 'batch-2'])
  })

  it('reports a failure for an unknown id without throwing', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'cancel', batchIds: ['does-not-exist'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.failed).toHaveLength(1)
  })
})
