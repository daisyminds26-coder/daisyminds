import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateBatch } from '@/features/batches/hooks/use-create-batch'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { createTestQueryClient } from '@/test/test-utils'
import type { CreateBatchPayload } from '@/features/batches/api/batches.api'

beforeEach(() => {
  resetBatchesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

function validPayload(overrides: Partial<CreateBatchPayload> = {}): CreateBatchPayload {
  return {
    courseId: 'course-1',
    name: 'January 2027 Batch',
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    maxStudents: 25,
    ...overrides,
  }
}

describe('useCreateBatch', () => {
  it('creates a batch as DRAFT', async () => {
    const { result } = renderHook(() => useCreateBatch(), { wrapper })

    act(() => {
      result.current.mutate(validPayload())
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('DRAFT')
    expect(result.current.data?.batchCode).toMatch(/^DM-BAT-/)
  })
})
