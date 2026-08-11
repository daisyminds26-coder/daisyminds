import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import UsersPage from '@/pages/admin/UsersPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetUsersMockState } from '@/test/msw/handlers/users.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetUsersMockState()
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

  return renderWithProviders(<UsersPage />, { route: '/admin/users', queryClient })
}

describe('UsersPage', () => {
  it('lists the seeded users', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('active@example.com')).toBeInTheDocument()
    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('active@example.com')
    await user.type(screen.getByPlaceholderText('Search by email…'), 'pending')

    await waitFor(() => {
      expect(screen.queryByText('active@example.com')).not.toBeInTheDocument()
    })
    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
  })

  it('opens the create-user drawer', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('active@example.com')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    expect(await screen.findByRole('heading', { name: 'Create user' })).toBeInTheDocument()
  })

  it('deactivates a user via the row action menu after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('active@example.com')
    await user.click(screen.getByRole('button', { name: /actions for active@example.com/i }))
    await user.click(await screen.findByText('Deactivate'))
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(screen.getAllByText('Deactivated').length).toBeGreaterThan(0)
    })
  })
})
