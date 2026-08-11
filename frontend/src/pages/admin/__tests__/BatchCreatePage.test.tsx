import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import BatchCreatePage from '@/pages/admin/BatchCreatePage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { listBatches } from '@/features/batches/api/batches.api'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import {
  getCreateBatchCallCount,
  resetBatchesMockState,
  setCreateBatchDelayMs,
} from '@/test/msw/handlers/batches.handlers'
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

  return renderWithProviders(<BatchCreatePage />, { route: '/admin/batches/new', queryClient })
}

describe('BatchCreatePage', () => {
  it('renders the create-batch wizard on its own page', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByRole('heading', { name: 'Create batch' })).toBeInTheDocument()
    expect(screen.getByText('Course & Identity')).toBeInTheDocument()
  })

  it('links back to the batches list', async () => {
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Create batch' })
    expect(screen.getByRole('link', { name: /back to batches/i })).toHaveAttribute(
      'href',
      '/admin/batches',
    )
  })

  it('blocks "Next" on step 1 until a course and name are provided', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Create batch' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Still on step 1 — validation blocked the advance.
    expect(screen.getByText('Course & Identity')).toBeInTheDocument()
    expect(await screen.findAllByText(/required|select a course/i)).not.toHaveLength(0)
  })

  it('advances through steps once required fields are filled, and creates a DRAFT batch on submit', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Create batch' })

    // Step 1: course + name
    await user.click(screen.getByRole('combobox'))
    const courseOption = await screen.findByText('Full Stack Web Development')
    await user.click(courseOption)
    await user.type(screen.getByLabelText('Batch name'), 'January 2027 Cohort')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 2: dates & timezone (defaults are pre-filled, timezone required has a default)
    await waitFor(() => {
      expect(screen.getByText('Dates & Timezone')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 3: trainers (optional)
    await waitFor(() => {
      expect(screen.getByText('Trainers')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 4: weekly timetable (optional, can skip)
    await waitFor(() => {
      expect(screen.getByText('Weekly Timetable')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 5: delivery & location
    await waitFor(() => {
      expect(screen.getByText('Delivery & Location')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 6: capacity — maxStudents required
    await waitFor(() => {
      expect(screen.getByText('Capacity')).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText('Max students'), '30')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 7: calendar exceptions (optional)
    await waitFor(() => {
      expect(screen.getByText('Calendar Exceptions')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Step 8: review + submit
    await waitFor(() => {
      expect(screen.getByText(/this batch will be created as draft/i)).toBeInTheDocument()
    })
    // Duplicate-submit prevention: hold the mock request open long enough
    // that a second, realistically-timed click lands while the button is
    // already disabled from the first (`userEvent.click` mimics real
    // pointer-event timing, unlike firing two bare DOM events back to
    // back) — confirming only one batch actually gets created.
    setCreateBatchDelayMs(50)
    const createButton = screen.getByRole('button', { name: /create batch/i })
    await user.click(createButton)
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create batch/i })).toBeEnabled()
    })

    expect(getCreateBatchCallCount()).toBe(1)
    const created = await listBatches({ page: 1, limit: 50, search: 'January 2027 Cohort' })
    expect(created.data).toHaveLength(1)
  })
})
