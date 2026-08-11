import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import TrainersPage from '@/pages/admin/TrainersPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetTrainersMockState } from '@/test/msw/handlers/trainers.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetTrainersMockState()
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

  return renderWithProviders(<TrainersPage />, { route: '/admin/trainers', queryClient })
}

describe('TrainersPage', () => {
  it('lists the seeded trainers', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Arjun Mehta')).toBeInTheDocument()
    expect(screen.getByText('Divya Nair')).toBeInTheDocument()
  })

  it('filters the table by search', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Arjun Mehta')
    await user.type(
      screen.getByPlaceholderText('Search by name, trainer ID, email, expertise…'),
      'Divya',
    )

    await waitFor(() => {
      expect(screen.queryByText('Arjun Mehta')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Divya Nair')).toBeInTheDocument()
  })

  it('links "Add Trainer" to the dedicated create page', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Arjun Mehta')
    expect(screen.getByRole('link', { name: /add trainer/i })).toHaveAttribute(
      'href',
      '/admin/trainers/new',
    )
  })

  it('deactivates a trainer via the row action menu after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Arjun Mehta')
    await user.click(screen.getByRole('button', { name: /actions for arjun mehta/i }))
    await user.click(await screen.findByText('Deactivate'))
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(screen.getAllByText('Deactivated').length).toBeGreaterThan(0)
    })
  })
})
