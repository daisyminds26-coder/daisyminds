import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useTrainersList } from '@/features/trainers/hooks/use-trainers-list'
import { resetTrainersMockState } from '@/test/msw/handlers/trainers.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetTrainersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useTrainersList', () => {
  it('loads the seeded trainers with pagination meta', async () => {
    const { result } = renderHook(() => useTrainersList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(2)
    expect(result.current.data?.meta.total).toBe(2)
  })

  it('filters by status', async () => {
    const { result } = renderHook(
      () => useTrainersList({ page: 1, limit: 20, status: 'PENDING_VERIFICATION' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.status).toBe('PENDING_VERIFICATION')
  })

  it('searches by first name', async () => {
    const { result } = renderHook(() => useTrainersList({ page: 1, limit: 20, search: 'Arjun' }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.firstName).toBe('Arjun')
  })
})
