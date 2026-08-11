import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useStudentsList } from '@/features/students/hooks/use-students-list'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetStudentsMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useStudentsList', () => {
  it('loads the seeded students with pagination meta', async () => {
    const { result } = renderHook(() => useStudentsList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(2)
    expect(result.current.data?.meta.total).toBe(2)
  })

  it('filters by status', async () => {
    const { result } = renderHook(
      () => useStudentsList({ page: 1, limit: 20, status: 'PENDING_VERIFICATION' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.status).toBe('PENDING_VERIFICATION')
  })

  it('searches by first name', async () => {
    const { result } = renderHook(() => useStudentsList({ page: 1, limit: 20, search: 'Priya' }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.firstName).toBe('Priya')
  })
})
