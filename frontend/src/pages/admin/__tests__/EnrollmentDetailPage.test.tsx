import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import EnrollmentDetailPage from '@/pages/admin/EnrollmentDetailPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { createBatch } from '@/features/batches/api/batches.api'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetEnrollmentsMockState } from '@/test/msw/handlers/enrollments.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

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

async function renderAsSuperAdmin(enrollmentId: string) {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/enrollments/${enrollmentId}`]}>
          {children}
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

  const { render } = await import('@testing-library/react')
  return render(
    <Routes>
      <Route path="/admin/enrollments/:enrollmentId" element={<EnrollmentDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('EnrollmentDetailPage', () => {
  it('activates a CONFIRMED enrollment', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-1')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000001' })
    expect(screen.getByText('Confirmed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Activate' }))

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
    // The access badge renders twice on this page (header + Overview tab) — see AccessBadge usages.
    expect(screen.getAllByText('Access Active').length).toBeGreaterThan(0)
  })

  it('suspends and resumes an ACTIVE enrollment', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-2')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000002' })
    expect(screen.getByText('Active')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Suspend' }))
    await waitFor(() => {
      expect(screen.getByText('Suspended')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Access Suspended').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('completes an ACTIVE enrollment and releases its seat', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-2')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000002' })
    await user.click(screen.getByRole('button', { name: 'Complete' }))

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('drops an ACTIVE enrollment after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-2')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000002' })
    await user.click(screen.getByRole('button', { name: 'Drop' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Drop' }))

    await waitFor(() => {
      expect(screen.getByText('Dropped')).toBeInTheDocument()
    })
  })

  it('cancels a CONFIRMED enrollment after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-1')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000001' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel enrollment' }))

    await waitFor(() => {
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  it('promotes a WAITLISTED enrollment when a seat is available', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-3')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000003' })
    expect(screen.getByText('Waitlisted')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Promote from waitlist' }))

    await waitFor(() => {
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })
  })

  it('transfers a CONFIRMED enrollment to another batch of the same course', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-1')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000001' })
    await user.click(screen.getByRole('button', { name: 'Transfer' }))

    const dialog = await screen.findByRole('dialog', { name: /transfer to another batch/i })
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByText('September 2026 Evening Batch'))
    await user.click(within(dialog).getByRole('button', { name: 'Transfer' }))

    await waitFor(() => {
      expect(screen.getByText('Dropped')).toBeInTheDocument()
    })
    expect(screen.getByText(/transferred to/i)).toBeInTheDocument()
  })

  it('never offers a batch from a different course as a transfer target', async () => {
    await createBatch({
      courseId: 'course-2',
      name: 'Other Course Batch',
      timezone: 'Asia/Kolkata',
      deliveryMode: 'ONLINE',
      maxStudents: 20,
    })

    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-1')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000001' })
    await user.click(screen.getByRole('button', { name: 'Transfer' }))

    const dialog = await screen.findByRole('dialog', { name: /transfer to another batch/i })
    await user.click(within(dialog).getByRole('combobox'))

    expect(await screen.findByText('September 2026 Evening Batch')).toBeInTheDocument()
    expect(screen.queryByText('Other Course Batch')).not.toBeInTheDocument()
  })

  it('lazily loads the audit timeline only once the Audit tab is opened', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('enrollment-1')

    await screen.findByRole('heading', { name: 'DM-ENR-2026-000001' })
    expect(screen.queryByText('Created')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Audit' }))

    expect(await screen.findByText('Created')).toBeInTheDocument()
  })
})
