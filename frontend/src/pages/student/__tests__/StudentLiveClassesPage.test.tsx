import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import StudentLiveClassesPage from '@/pages/student/StudentLiveClassesPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetLiveClassesMockState } from '@/test/msw/handlers/live-classes.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetLiveClassesMockState()
  resetAuthStore()
})

async function renderAsStudent() {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(<StudentLiveClassesPage />, {
    route: '/student/live-classes',
    queryClient,
  })
}

describe('StudentLiveClassesPage', () => {
  it('shows a "Join Class" button for a session within its join window, and shows the cancelled session with a clear cancelled state', async () => {
    await renderAsStudent()

    expect(await screen.findByText('Week 2 — Live Session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join class/i })).toBeInTheDocument()

    expect(screen.getByText('Week 0 — Orientation (cancelled)')).toBeInTheDocument()
    expect(screen.getByText(/this session was cancelled/i)).toBeInTheDocument()
  })

  it('never shows a DRAFT (not-yet-published) session to a student', async () => {
    await renderAsStudent()

    await screen.findByText('Week 2 — Live Session')
    expect(screen.queryByText('Week 1 — Introduction')).not.toBeInTheDocument()
  })
})
