import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import TrainerCreatePage from '@/pages/admin/TrainerCreatePage'
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

  return renderWithProviders(<TrainerCreatePage />, { route: '/admin/trainers/new', queryClient })
}

describe('TrainerCreatePage', () => {
  it('renders the create-trainer wizard on its own page', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByRole('heading', { name: 'Create trainer' })).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('links back to the trainers list', async () => {
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Create trainer' })
    expect(screen.getByRole('link', { name: /back to trainers/i })).toHaveAttribute(
      'href',
      '/admin/trainers',
    )
  })
})
