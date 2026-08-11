import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import EnrollmentCreatePage from '@/pages/admin/EnrollmentCreatePage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetBatchesMockState, findBatchById } from '@/test/msw/handlers/batches.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetEnrollmentsMockState } from '@/test/msw/handlers/enrollments.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  // Order matters: enrollment seeding bumps the freshly-reset batches'
  // occupiedSeats — see `enrollments.handlers.ts#resetEnrollmentsMockState`.
  resetBatchesMockState()
  resetStudentsMockState()
  resetCoursesMockState()
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

  return renderWithProviders(<EnrollmentCreatePage />, {
    route: '/admin/enrollments/new',
    queryClient,
  })
}

describe('EnrollmentCreatePage', () => {
  it('renders the four-step wizard and blocks "Next" until a student is selected', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Enrol a student' })
    expect(screen.getByText('Batch')).toBeInTheDocument()
    expect(screen.getByText('Capacity')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/^select a student$/i)).toBeInTheDocument()
  })

  it('shows the "batch full — will be waitlisted" notice once a full, waitlist-enabled batch is picked', async () => {
    const batch = findBatchById('batch-2')
    if (batch) {
      batch.maxStudents = 1
      batch.occupiedSeats = 1
      batch.availableSeats = 0
      batch.waitlistEnabled = true
    }

    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Enrol a student' })
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Priya Sharma', { exact: false }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('September 2026 Evening Batch'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText(/batch full — student will be waitlisted/i)).toBeInTheDocument()
  })
})
