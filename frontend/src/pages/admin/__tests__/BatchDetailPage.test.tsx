import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import BatchDetailPage from '@/pages/admin/BatchDetailPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetTrainersMockState } from '@/test/msw/handlers/trainers.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { resetEnrollmentsMockState } from '@/test/msw/handlers/enrollments.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetBatchesMockState()
  resetCoursesMockState()
  resetTrainersMockState()
  resetStudentsMockState()
  // Order matters: enrollment seeding bumps the freshly-reset batches'
  // occupiedSeats — see `enrollments.handlers.ts#resetEnrollmentsMockState`.
  resetEnrollmentsMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin(batchId = 'batch-1') {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/batches/${batchId}`]}>{children}</MemoryRouter>
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

  const { render } = await import('@testing-library/react')
  return render(
    <Routes>
      <Route path="/admin/batches/:batchId" element={<BatchDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('BatchDetailPage', () => {
  it('renders the header with name, batch code, and status', async () => {
    await renderAsSuperAdmin('batch-1')

    expect(
      await screen.findByRole('heading', { name: 'August 2026 Morning Batch' }),
    ).toBeInTheDocument()
    expect(screen.getByText('DM-BAT-2026-000001')).toBeInTheDocument()
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
  })

  it('renders Overview tab content: course, trainer, and operational health', async () => {
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    expect(await screen.findByText('Full Stack Web Development')).toBeInTheDocument()
    expect(await screen.findByText('Arjun Mehta')).toBeInTheDocument()
    expect(await screen.findByText('Operational health')).toBeInTheDocument()
    // batch-2 is seeded with a hardcoded conflict pair — see `computeConflicts` in batches.handlers.ts.
    expect(
      await screen.findByText('Trainer has declared unavailability during this weekly slot'),
    ).toBeInTheDocument()
  })

  it('shows readiness blockers in the Overview health panel for a batch missing a trainer and timetable', async () => {
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    expect(
      await screen.findByText('A primary trainer must be assigned before scheduling'),
    ).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('never renders an enrolled/seat-count figure anywhere on the page', async () => {
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    expect(document.body.textContent).not.toMatch(/enrolled/i)
    expect(screen.queryByText(/\d+\s*\/\s*\d+\s*students/i)).not.toBeInTheDocument()
  })

  it('shows "Schedule Batch" and "Cancel" for a DRAFT batch, and none of the other lifecycle actions', async () => {
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    expect(screen.getByRole('button', { name: 'Schedule Batch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('shows "Activate", "Return to Draft", and "Cancel" for a SCHEDULED batch, not "Schedule Batch"', async () => {
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Return to Draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Schedule Batch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
  })

  it('activates a scheduled batch directly (no confirmation)', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    await user.click(screen.getByRole('button', { name: 'Activate' }))

    await waitFor(() => {
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    })
  })

  it('requires confirmation before cancelling a batch', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('Cancel this batch?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel batch' }))

    await waitFor(() => {
      expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
    })
  })

  it('requires confirmation before deleting a batch and explains it is recoverable', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Delete this batch?')).toBeInTheDocument()
    expect(screen.getByText(/can be restored later/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Delete this batch?')).not.toBeInTheDocument()
    })
  })

  it('does not render an input for batchCode or courseId on the Operations tab (immutable fields)', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    await waitFor(() => {
      expect(screen.getAllByText('DM-BAT-2026-000001').length).toBeGreaterThan(0)
    })
    expect(screen.queryByLabelText(/batch code/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/course id/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Batch name')).toBeInTheDocument()
  })

  it('updates fields via the Operations tab edit form', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    const nameInput = await screen.findByLabelText('Batch name')
    await user.clear(nameInput)
    await user.type(nameInput, 'August 2026 Morning Batch (Renamed)')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'August 2026 Morning Batch (Renamed)' }),
      ).toBeInTheDocument()
    })
  })

  it('renders the weekly schedule and calendar exceptions editors on the Schedule tab, pre-filled with existing data', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    await user.click(screen.getByRole('tab', { name: 'Schedule' }))

    expect(await screen.findByText('Weekly timetable')).toBeInTheDocument()
    expect(screen.getByText('Calendar exceptions')).toBeInTheDocument()
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument()
  })

  it('shows a "Check conflicts" affordance on the Trainer tab that re-renders the conflicts panel', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    await user.click(screen.getByRole('tab', { name: 'Trainer' }))

    const checkButton = await screen.findByRole('button', { name: /check conflicts/i })
    await user.click(checkButton)

    expect(await screen.findByText('Availability conflict')).toBeInTheDocument()
  })

  it('lazy-loads the Audit tab only after it is selected', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    expect(screen.queryByText('No activity recorded')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Audit' }))

    expect(await screen.findByText('No activity recorded')).toBeInTheDocument()
  })

  it('opens the duplicate dialog and creates a new batch', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('button', { name: /duplicate/i }))

    const nameInput = await screen.findByLabelText('New batch name')
    expect(nameInput).toHaveValue('August 2026 Morning Batch (Copy)')
    await user.click(screen.getByRole('button', { name: /^duplicate$/i }))

    await waitFor(() => {
      expect(screen.queryByText('Duplicate batch')).not.toBeInTheDocument()
    })
  })

  it('shows real seat capacity and waitlist count on the Students tab', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Students' }))

    // batch-1 seed: one CONFIRMED enrolment (occupied) + one WAITLISTED.
    expect(await screen.findByText('1 / 30')).toBeInTheDocument()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
  })

  it('links "Add Student" on the Students tab to the create page, pre-scoped to this batch', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Students' }))

    expect(await screen.findByRole('link', { name: /add student/i })).toHaveAttribute(
      'href',
      '/admin/enrollments/new?batchId=batch-1',
    )
  })

  it('shows the capacity widget with Available/Waitlist/Utilization stats on Overview', async () => {
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    expect(await screen.findByText('1 / 30 Seats Occupied')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Waitlist')).toBeInTheDocument()
    expect(screen.getByText('Utilization')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(/seats occupied/i)
  })

  it('filters the roster by search on the Students tab', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Students' }))

    await screen.findByText('Priya Sharma')
    await user.type(
      screen.getByPlaceholderText('Search by student name, ID, or enrollment code…'),
      'Priya',
    )

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).queryByText('Rahul Verma')).not.toBeInTheDocument()
    })
  })

  it('suspends an ACTIVE enrolment from the roster row menu', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    await user.click(screen.getByRole('tab', { name: 'Students' }))

    await screen.findByText('Rahul Verma')
    await user.click(screen.getByRole('button', { name: /actions for rahul verma/i }))
    await user.click(await screen.findByText('Suspend'))

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).getByText('Suspended')).toBeInTheDocument()
    })
  })

  it('promotes a waitlisted student from the Waitlist panel on the Students tab', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Students' }))

    await screen.findByText('Waitlist')
    const promoteButton = await screen.findByRole('button', { name: 'Promote' })
    await user.click(promoteButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Promote' })).not.toBeInTheDocument()
    })
  })

  it('never fakes a percentage or count for a future module — shows "Available in a later phase" instead', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    expect(await screen.findAllByText('Available in a later phase')).not.toHaveLength(0)
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument()
  })

  it('shows the weekly timetable summary with formatted times and total hours on the Schedule tab', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('batch-2')

    await screen.findByRole('heading', { name: 'September 2026 Evening Batch' })
    await user.click(screen.getByRole('tab', { name: 'Schedule' }))

    // "Monday" also appears in the weekly-schedule edit form's day selector below, so assert count instead of a single match.
    expect(await screen.findAllByText('Monday')).not.toHaveLength(0)
    expect(screen.getByText('6:00 PM – 8:00 PM')).toBeInTheDocument()
    expect(screen.getByText(/2 weekly teaching hours/)).toBeInTheDocument()
  })

  it('quick actions on Overview link "Enrol Student" pre-scoped to this batch', async () => {
    await renderAsSuperAdmin('batch-1')

    await screen.findByRole('heading', { name: 'August 2026 Morning Batch' })
    expect(await screen.findByText('Quick actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /enrol student/i })).toHaveAttribute(
      'href',
      '/admin/enrollments/new?batchId=batch-1',
    )
  })
})
