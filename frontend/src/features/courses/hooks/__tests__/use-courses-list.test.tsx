import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCoursesList } from '@/features/courses/hooks/use-courses-list'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetCoursesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useCoursesList', () => {
  it('loads the seeded courses with pagination meta', async () => {
    const { result } = renderHook(() => useCoursesList({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(2)
    expect(result.current.data?.meta.total).toBe(2)
  })

  it('filters by status', async () => {
    const { result } = renderHook(() => useCoursesList({ page: 1, limit: 20, status: 'DRAFT' }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.status).toBe('DRAFT')
  })

  it('searches by title', async () => {
    const { result } = renderHook(
      () => useCoursesList({ page: 1, limit: 20, search: 'Data Science' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]?.title).toBe('Data Science Bootcamp')
  })
})
