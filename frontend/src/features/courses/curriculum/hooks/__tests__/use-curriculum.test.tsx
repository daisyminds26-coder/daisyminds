import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  useCurriculum,
  useCurriculumReadiness,
} from '@/features/courses/curriculum/hooks/use-curriculum'
import { useCreateModule } from '@/features/courses/curriculum/hooks/use-module-mutations'
import { resetCurriculumMockState } from '@/test/msw/handlers/curriculum.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetCurriculumMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useCurriculum', () => {
  it('fetches the seeded curriculum tree for a course', async () => {
    const { result } = renderHook(() => useCurriculum('course-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.modules).toHaveLength(2)
    expect(result.current.data?.modules[0]?.lessons).toHaveLength(2)
  })

  it('is disabled without a courseId', () => {
    const { result } = renderHook(() => useCurriculum(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCurriculumReadiness', () => {
  it('reports ready for a course with modules and lessons', async () => {
    const { result } = renderHook(() => useCurriculumReadiness('course-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.ready).toBe(true)
    expect(result.current.data?.summary.moduleCount).toBe(2)
  })

  it('reports not ready for a course with no curriculum', async () => {
    const { result } = renderHook(() => useCurriculumReadiness('course-2'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.ready).toBe(false)
  })
})

describe('query cache consistency', () => {
  it('invalidates the tree query after creating a module', async () => {
    function useCombined() {
      const tree = useCurriculum('course-1')
      const createModule = useCreateModule('course-1')
      return { tree, createModule }
    }

    const { result } = renderHook(() => useCombined(), { wrapper })

    await waitFor(() => {
      expect(result.current.tree.isSuccess).toBe(true)
    })
    expect(result.current.tree.data?.modules).toHaveLength(2)

    act(() => {
      result.current.createModule.mutate({ title: 'Fresh Module' })
    })

    await waitFor(() => {
      expect(result.current.createModule.isSuccess).toBe(true)
    })
    await waitFor(() => {
      expect(result.current.tree.data?.modules).toHaveLength(3)
    })
  })
})
