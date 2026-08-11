import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import StudentsPage from '@/pages/admin/StudentsPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetEnrollmentsMockState } from '@/test/msw/handlers/enrollments.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetStudentsMockState()
  resetBatchesMockState()
  resetCoursesMockState()
  // Order matters: enrollment seeding bumps the freshly-reset batches'
  // occupiedSeats — see `enrollments.handlers.ts#resetEnrollmentsMockState`.
  resetEnrollmentsMockState()
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

  return renderWithProviders(<StudentsPage />, { route: '/admin/students', queryClient })
}

describe('StudentsPage', () => {
  it('lists the seeded students', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument()
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    await user.type(screen.getByPlaceholderText('Search by name, student ID, email…'), 'Rahul')

    await waitFor(() => {
      expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument()
  })

  it('links "Add Student" to the dedicated create page', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    expect(screen.getByRole('link', { name: /add student/i })).toHaveAttribute(
      'href',
      '/admin/students/new',
    )
  })

  it('deactivates a student via the row action menu after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    await user.click(screen.getByRole('button', { name: /actions for priya sharma/i }))
    await user.click(await screen.findByText('Deactivate'))
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(screen.getAllByText('Deactivated').length).toBeGreaterThan(0)
    })
  })

  it('lazily loads enrolment history on the student detail drawer, linking to the enrolment detail page', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    await user.click(screen.getByText('Priya Sharma'))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText(/DM-ENR-2026-000001/)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('tab', { name: 'Enrolments' }))

    expect(await within(dialog).findByText(/DM-ENR-2026-000001/)).toBeInTheDocument()
    expect(
      within(dialog).getByRole('link', { name: /full stack web development/i }),
    ).toHaveAttribute('href', '/admin/enrollments/enrollment-1')
  })
})
