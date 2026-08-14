import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import TrainerLiveClassesPage from '@/pages/trainer/TrainerLiveClassesPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetLiveClassesMockState } from '@/test/msw/handlers/live-classes.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetLiveClassesMockState()
  resetAuthStore()
})

async function renderAsTrainer() {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email: 'trainer@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(<TrainerLiveClassesPage />, {
    route: '/trainer/live-classes',
    queryClient,
  })
}

describe('TrainerLiveClassesPage', () => {
  it('lists the sessions this trainer is assigned to teach', async () => {
    await renderAsTrainer()

    expect(await screen.findByText('Week 2 — Live Session')).toBeInTheDocument()
    expect(screen.getByText('Week 1 — Introduction')).toBeInTheDocument()
  })

  it('marks a LIVE session complete via the row action', async () => {
    const user = userEvent.setup()
    await renderAsTrainer()

    await screen.findByText('Week 2 — Live Session')
    await user.click(screen.getByRole('button', { name: 'Mark complete' }))

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })
})
