import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import CoursesPage from '@/pages/admin/CoursesPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetCoursesMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin() {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email: 'superadmin@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(<CoursesPage />, { route: '/admin/courses', queryClient })
}

describe('CoursesPage', () => {
  it('lists the seeded courses', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Full Stack Web Development')).toBeInTheDocument()
    expect(screen.getByText('Data Science Bootcamp')).toBeInTheDocument()
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Full Stack Web Development')
    await user.type(
      screen.getByPlaceholderText('Search by title, course code, category, tags…'),
      'Data Science',
    )

    await waitFor(() => {
      expect(screen.queryByText('Full Stack Web Development')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Data Science Bootcamp')).toBeInTheDocument()
  })

  it('links "Add Course" to the dedicated create page', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Full Stack Web Development')
    expect(screen.getByRole('link', { name: /add course/i })).toHaveAttribute(
      'href',
      '/admin/courses/new',
    )
  })

  it('archives a course via the row action menu after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Data Science Bootcamp')
    await user.click(screen.getByRole('button', { name: /actions for data science bootcamp/i }))
    await user.click(await screen.findByText('Archive'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))

    await waitFor(() => {
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0)
    })
  })

  it('shows the publication readiness panel and the primary stat cards', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Total Courses')).toBeInTheDocument()
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0)
  })
})
