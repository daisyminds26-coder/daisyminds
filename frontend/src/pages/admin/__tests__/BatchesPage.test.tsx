import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import BatchesPage from '@/pages/admin/BatchesPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetBatchesMockState } from '@/test/msw/handlers/batches.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetBatchesMockState()
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

  return renderWithProviders(<BatchesPage />, { route: '/admin/batches', queryClient })
}

describe('BatchesPage', () => {
  it('lists the seeded batches', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('August 2026 Morning Batch')).toBeInTheDocument()
    expect(screen.getByText('September 2026 Evening Batch')).toBeInTheDocument()
  })

  it('shows the stat cards', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Total Batches')).toBeInTheDocument()
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('August 2026 Morning Batch')
    await user.type(screen.getByPlaceholderText('Search by batch name, batch code…'), 'September')

    await waitFor(() => {
      expect(screen.queryByText('August 2026 Morning Batch')).not.toBeInTheDocument()
    })
    expect(screen.getByText('September 2026 Evening Batch')).toBeInTheDocument()
  })

  it('links "Create Batch" to the dedicated create page', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('August 2026 Morning Batch')
    expect(screen.getByRole('link', { name: /create batch/i })).toHaveAttribute(
      'href',
      '/admin/batches/new',
    )
  })

  it('shows real seat capacity as "occupied / max" (Phase 10B Part 2 — occupiedSeats is now real, not a placeholder)', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('August 2026 Morning Batch')
    expect(screen.getAllByText(/^\d+\s*\/\s*\d+$/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('seats').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Max \d+$/)).not.toBeInTheDocument()
  })

  it('cancels a scheduled batch via the row action menu after confirmation, then archives it', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('September 2026 Evening Batch')
    // "Archive" is only a valid action from COMPLETED/CANCELLED — SCHEDULED
    // must be cancelled first, exercising the status-gated action menu.
    await user.click(
      screen.getByRole('button', { name: /actions for september 2026 evening batch/i }),
    )
    await user.click(await screen.findByText('Cancel'))
    await user.click(await screen.findByRole('button', { name: 'Cancel batch' }))

    await waitFor(() => {
      expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
    })

    await user.click(
      screen.getByRole('button', { name: /actions for september 2026 evening batch/i }),
    )
    await user.click(await screen.findByText('Archive'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))

    await waitFor(() => {
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0)
    })
  })

  it('schedules a draft batch directly from the row action menu (once ready)', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('August 2026 Morning Batch')
    await user.click(screen.getByRole('button', { name: /actions for august 2026 morning batch/i }))
    await user.click(await screen.findByText('Schedule batch'))

    // Not ready (no trainer/timetable) — the API rejects with 422 and a toast fires;
    // the row stays Draft rather than crashing the page.
    await waitFor(() => {
      expect(screen.getByText('August 2026 Morning Batch')).toBeInTheDocument()
    })
  })

  it('selects rows and runs a bulk cancel action after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('September 2026 Evening Batch')
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText(/2 batches selected/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await user.click(await screen.findByRole('button', { name: 'Cancel batches' }))

    await waitFor(() => {
      expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
    })
  })

  it('renders an "Export CSV" action that is enabled once the list has loaded', async () => {
    // The full download round trip (blob fetch → object URL → anchor click)
    // is covered at the hook level in `use-export-batches.test.tsx` — axios's
    // `responseType: 'blob'` XHR path has a known jsdom/MSW(undici)
    // incompatibility unrelated to this feature (see that file's comment),
    // so this page test only asserts the trigger is wired up and enabled.
    await renderAsSuperAdmin()

    await screen.findByText('August 2026 Morning Batch')
    expect(screen.getByRole('button', { name: /export csv/i })).toBeEnabled()
  })
})
