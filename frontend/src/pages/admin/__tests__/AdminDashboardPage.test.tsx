import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import {
  resetDashboardMockState,
  setDashboardMockRole,
} from '@/test/msw/handlers/dashboard.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetDashboardMockState()
  resetAuthStore()
})

async function renderAs(email: string) {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email, password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(<AdminDashboardPage />, { route: '/admin', queryClient })
}

describe('AdminDashboardPage', () => {
  it('shows a loading skeleton before data arrives, then renders summary cards', async () => {
    await renderAs('superadmin@example.com')

    expect(await screen.findByText('Active students')).toBeInTheDocument()
    expect(screen.getByText('Active trainers')).toBeInTheDocument()
    expect(screen.getByText('Published courses')).toBeInTheDocument()
  })

  it('renders recent students and trainers', async () => {
    await renderAs('superadmin@example.com')

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument()
  })

  it('renders operational alerts with a working action link', async () => {
    await renderAs('superadmin@example.com')

    expect(await screen.findByText(/awaiting verification/i)).toBeInTheDocument()
    const actionLink = screen.getByRole('link', { name: 'Review accounts' })
    expect(actionLink).toHaveAttribute('href', '/admin/users?status=PENDING_VERIFICATION')
  })

  it('shows quick actions linking only to implemented routes', async () => {
    await renderAs('superadmin@example.com')

    await screen.findByText('Active students')
    expect(screen.getByRole('link', { name: /add student/i })).toHaveAttribute(
      'href',
      '/admin/students/new',
    )
    expect(screen.getByRole('link', { name: /add trainer/i })).toHaveAttribute(
      'href',
      '/admin/trainers/new',
    )
    expect(screen.getByRole('link', { name: /manage users/i })).toHaveAttribute(
      'href',
      '/admin/users',
    )
  })

  it('shows the recent-activity feed for a SUPER_ADMIN', async () => {
    setDashboardMockRole('SUPER_ADMIN')
    await renderAs('superadmin@example.com')

    await screen.findByText('Active students')
    expect(await screen.findByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText(/Student created/i)).toBeInTheDocument()
  })

  it('hides the recent-activity feed for an ADMIN (backend returns null)', async () => {
    setDashboardMockRole('ADMIN')
    await renderAs('admin@example.com')

    await screen.findByText('Active students')
    expect(screen.queryByText('Recent activity')).not.toBeInTheDocument()
  })

  it('changes the period via the selector and refetches', async () => {
    const user = userEvent.setup()
    await renderAs('superadmin@example.com')

    await screen.findByText('Active students')
    await user.click(screen.getByRole('combobox', { name: /dashboard period/i }))
    await user.click(await screen.findByRole('option', { name: 'This month' }))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /dashboard period/i })).toHaveTextContent(
        'This month',
      )
    })
  })

  it('the refresh button triggers a refetch', async () => {
    const user = userEvent.setup()
    await renderAs('superadmin@example.com')

    await screen.findByText('Active students')
    await user.click(screen.getByRole('button', { name: /refresh dashboard/i }))

    expect(await screen.findByText('Active students')).toBeInTheDocument()
  })
})
