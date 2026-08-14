import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import TrainerAttendancePage from '@/pages/trainer/TrainerAttendancePage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetLiveClassesMockState } from '@/test/msw/handlers/live-classes.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetLiveClassesMockState()
  resetAuthStore()
})

async function renderAsTrainer(route: string) {
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

  return renderWithProviders(<TrainerAttendancePage />, { route, queryClient })
}

describe('TrainerAttendancePage', () => {
  it("marks a student present for the selected session, and never shows a Finalize action (trainers can't finalize)", async () => {
    const user = userEvent.setup()
    await renderAsTrainer('/trainer/attendance?sessionId=2')

    await screen.findByText('Priya Sharma')
    const priyaGroup = screen.getByRole('group', { name: /mark attendance for priya sharma/i })
    await user.click(within(priyaGroup).getByRole('button', { name: 'Present' }))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    await waitFor(() => {
      expect(screen.getAllByText('Present').length).toBeGreaterThan(0)
    })
    expect(screen.queryByRole('button', { name: 'Finalize attendance' })).not.toBeInTheDocument()
  })
})
