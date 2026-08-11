import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useActivateStudent,
  useDeactivateStudent,
  useSoftDeleteStudent,
} from '@/features/students/hooks/use-student-lifecycle'
import { useBulkAction } from '@/features/students/hooks/use-bulk-action'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetStudentsMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('student lifecycle mutations', () => {
  it('deactivates then reactivates a student', async () => {
    const { result: deactivate } = renderHook(() => useDeactivateStudent(), { wrapper })
    act(() => {
      deactivate.current.mutate('student-1')
    })
    await waitFor(() => {
      expect(deactivate.current.isSuccess).toBe(true)
    })
    expect(deactivate.current.data?.status).toBe('DEACTIVATED')

    const { result: activate } = renderHook(() => useActivateStudent(), { wrapper })
    act(() => {
      activate.current.mutate('student-1')
    })
    await waitFor(() => {
      expect(activate.current.isSuccess).toBe(true)
    })
    expect(activate.current.data?.status).toBe('ACTIVE')
  })

  it('soft-deletes a student', async () => {
    const { result } = renderHook(() => useSoftDeleteStudent(), { wrapper })
    act(() => {
      result.current.mutate('student-1')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useBulkAction', () => {
  it('activates multiple students', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'activate', studentIds: ['student-1', 'student-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.succeeded).toEqual(['student-1', 'student-2'])
  })

  it('reports a failure for an unknown id without throwing', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'deactivate', studentIds: ['does-not-exist'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.failed).toHaveLength(1)
  })
})
