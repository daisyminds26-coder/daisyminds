import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import EnrollmentsPage from '@/pages/admin/EnrollmentsPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
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

  return renderWithProviders(<EnrollmentsPage />, { route: '/admin/enrollments', queryClient })
}

/** Status labels (Confirmed/Active/Waitlisted/Suspended) also appear as stat-card labels above the table, so row assertions are always scoped to the table itself. */
async function findTable() {
  return screen.findByRole('table')
}

describe('EnrollmentsPage', () => {
  it('renders the header and the seeded enrolments with their status/access badges', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByRole('heading', { name: 'Student Enrolments' })).toBeInTheDocument()
    const table = await findTable()
    expect(within(table).getByText('DM-ENR-2026-000001')).toBeInTheDocument()
    expect(within(table).getByText('Priya Sharma')).toBeInTheDocument()
    expect(within(table).getByText('Confirmed')).toBeInTheDocument()
    // Rahul has two enrolments seeded (an ACTIVE one and a WAITLISTED one).
    expect(within(table).getAllByText('Rahul Verma')).toHaveLength(2)
    expect(within(table).getByText('Active')).toBeInTheDocument()
    expect(within(table).getByText('Waitlisted')).toBeInTheDocument()
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    await user.type(
      screen.getByPlaceholderText('Search by enrollment code, student, batch, or course…'),
      'Rahul',
    )

    await waitFor(() => {
      expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Rahul Verma')).toHaveLength(2)
  })

  it('links "Enrol Student" to the dedicated create page', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    expect(screen.getByRole('link', { name: /enrol student/i })).toHaveAttribute(
      'href',
      '/admin/enrollments/new',
    )
  })

  it('renders an enabled "Export CSV" action once the list has loaded', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    expect(screen.getByRole('button', { name: /export csv/i })).toBeEnabled()
  })

  it('promotes a waitlisted student from the row actions menu', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('DM-ENR-2026-000002')
    const table = await findTable()
    expect(within(table).getByText('Waitlisted')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /actions for enrollment dm-enr-2026-000003/i }),
    )
    await user.click(await screen.findByText('Promote from waitlist'))

    await waitFor(() => {
      expect(within(table).queryByText('Waitlisted')).not.toBeInTheDocument()
    })
  })

  it('cancels an enrollment from the row actions menu after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Priya Sharma')
    const table = await findTable()
    expect(within(table).getByText('Confirmed')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /actions for enrollment dm-enr-2026-000001/i }),
    )
    await user.click(await screen.findByText('Cancel enrollment'))
    await user.click(await screen.findByRole('button', { name: 'Cancel enrollment' }))

    await waitFor(() => {
      expect(within(table).queryByText('Confirmed')).not.toBeInTheDocument()
    })
    expect(within(table).getByText('Cancelled')).toBeInTheDocument()
  })

  it('bulk-suspends the selected enrolments, applying only to the ones actually ACTIVE', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('DM-ENR-2026-000002')
    const table = await findTable()
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText('3 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /suspend/i }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Suspend' }))

    // Rahul's enrolment (the only ACTIVE one of the three selected) is the
    // one the mock backend can actually suspend — Priya's CONFIRMED and the
    // WAITLISTED enrolment are rejected server-side, a partial result, not
    // a total failure. Selection always clears once the bulk call settles.
    await waitFor(() => {
      expect(within(table).getByText('Suspended')).toBeInTheDocument()
    })
    expect(screen.queryByText('3 selected')).not.toBeInTheDocument()
  })
})
