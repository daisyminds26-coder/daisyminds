import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import CourseCurriculumPage from '@/pages/admin/CourseCurriculumPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { Toaster } from '@/shared/components/ui/sonner'
import { TEST_API_BASE_URL } from '@/test/api-base-url'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetCurriculumMockState } from '@/test/msw/handlers/curriculum.handlers'
import { server } from '@/test/msw/server'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetCoursesMockState()
  resetCurriculumMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin(courseId = 'course-1') {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/courses/${courseId}/curriculum`]}>
          {children}
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  const { result } = renderHook(() => useLogin(), { wrapper: Wrapper })
  act(() => {
    result.current.mutate({ email: 'superadmin@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return render(
    <Routes>
      <Route path="/admin/courses/:courseId/curriculum" element={<CourseCurriculumPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('CourseCurriculumPage — error and permission states', () => {
  it('shows an error state with a retry action when the curriculum tree fails to load', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/courses/:courseId/curriculum`, () =>
        HttpResponse.json(
          { success: false, message: 'Server error', code: 'INTERNAL_SERVER_ERROR' },
          { status: 500 },
        ),
      ),
    )

    await renderAsSuperAdmin()

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows an error state when the course itself fails to load', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/courses/:courseId`, () =>
        HttpResponse.json(
          { success: false, message: 'Course not found', code: 'NOT_FOUND' },
          { status: 404 },
        ),
      ),
    )

    await renderAsSuperAdmin()

    expect(await screen.findByText(/couldn't load this course/i)).toBeInTheDocument()
  })

  it('surfaces a permission-denied error as a toast when a mutation is forbidden', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'You do not have permission to perform this action',
            code: 'FORBIDDEN',
          },
          { status: 403 },
        ),
      ),
    )

    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /add module/i }))
    await user.type(screen.getByLabelText('Title'), 'Blocked Module')
    await user.click(screen.getByRole('button', { name: 'Add module' }))

    expect(
      await screen.findAllByText(/you do not have permission to perform this action/i),
    ).not.toHaveLength(0)
  })

  it('surfaces a validation error from the API as a toast', async () => {
    server.use(
      http.patch(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This prerequisite would create a circular dependency',
            code: 'BAD_REQUEST',
          },
          { status: 400 },
        ),
      ),
    )

    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Edit'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findAllByText(/this prerequisite would create a circular dependency/i),
    ).not.toHaveLength(0)
  })

  it('leaves the module order unchanged in the UI when a reorder request fails (no optimistic update to roll back)', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/reorder`, () =>
        HttpResponse.json(
          { success: false, message: 'Could not reorder modules', code: 'CONFLICT' },
          { status: 409 },
        ),
      ),
    )

    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Move down'))

    expect(await screen.findAllByText(/could not reorder modules/i)).not.toHaveLength(0)
    const titles = screen
      .getAllByText(/Getting Started|Advanced Topics/)
      .map((el) => el.textContent)
    expect(titles.indexOf('Getting Started')).toBeLessThan(titles.indexOf('Advanced Topics'))
  })
})
