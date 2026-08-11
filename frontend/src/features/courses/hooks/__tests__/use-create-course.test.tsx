import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateCourse } from '@/features/courses/hooks/use-create-course'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { createTestQueryClient } from '@/test/test-utils'
import type { CreateCoursePayload } from '@/features/courses/api/courses.api'

beforeEach(() => {
  resetCoursesMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

function validPayload(overrides: Partial<CreateCoursePayload> = {}): CreateCoursePayload {
  return {
    title: 'Introduction to Cloud Computing',
    category: 'Cloud',
    level: 'BEGINNER',
    deliveryMode: 'ONLINE',
    pricing: { pricingType: 'FREE', currency: 'INR', basePrice: 0 },
    ...overrides,
  }
}

describe('useCreateCourse', () => {
  it('creates a course as DRAFT', async () => {
    const { result } = renderHook(() => useCreateCourse(), { wrapper })

    act(() => {
      result.current.mutate(validPayload())
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('DRAFT')
    expect(result.current.data?.courseCode).toMatch(/^DM-CRS-/)
  })
})
