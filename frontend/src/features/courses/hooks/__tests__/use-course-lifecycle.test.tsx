import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useArchiveCourse,
  usePublishCourse,
  useRestoreCourse,
  useSoftDeleteCourse,
} from '@/features/courses/hooks/use-course-lifecycle'
import { useBulkAction } from '@/features/courses/hooks/use-bulk-action'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetCoursesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('course lifecycle mutations', () => {
  it('publish is rejected with blockers when the course has no thumbnail', async () => {
    const { result } = renderHook(() => usePublishCourse(), { wrapper })
    act(() => {
      result.current.mutate('course-1')
    })
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('archives then restores a course', async () => {
    const { result: archive } = renderHook(() => useArchiveCourse(), { wrapper })
    act(() => {
      archive.current.mutate('course-1')
    })
    await waitFor(() => {
      expect(archive.current.isSuccess).toBe(true)
    })
    expect(archive.current.data?.status).toBe('ARCHIVED')

    const { result: restore } = renderHook(() => useRestoreCourse(), { wrapper })
    act(() => {
      restore.current.mutate('course-1')
    })
    await waitFor(() => {
      expect(restore.current.isSuccess).toBe(true)
    })
    expect(restore.current.data?.status).toBe('DRAFT')
  })

  it('soft-deletes a course', async () => {
    const { result } = renderHook(() => useSoftDeleteCourse(), { wrapper })
    act(() => {
      result.current.mutate('course-1')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useBulkAction', () => {
  it('archives multiple courses', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'archive', courseIds: ['course-1', 'course-2'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.succeeded).toEqual(['course-1', 'course-2'])
  })

  it('reports a failure for an unknown id without throwing', async () => {
    const { result } = renderHook(() => useBulkAction(), { wrapper })
    act(() => {
      result.current.mutate({ action: 'archive', courseIds: ['does-not-exist'] })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.failed).toHaveLength(1)
  })
})
