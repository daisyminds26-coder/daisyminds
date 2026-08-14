import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import LiveClassDetailPage from '@/pages/admin/LiveClassDetailPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetLiveClassesMockState } from '@/test/msw/handlers/live-classes.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetLiveClassesMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin(liveClassId: string) {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/live-classes/${liveClassId}`]}>
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

  return render(
    <Routes>
      <Route path="/admin/live-classes/:liveClassId" element={<LiveClassDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('LiveClassDetailPage', () => {
  it('schedules a DRAFT session via the "Schedule" action, moving it to SCHEDULED', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('1')

    await screen.findByText('Week 1 — Introduction')
    expect(screen.getByText('Draft')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Schedule' }))

    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })
  })

  it('marks a student present in the Attendance tab, saves, then finalizing marks the rest ABSENT', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin('2')

    await screen.findByText('Week 2 — Live Session')
    await user.click(screen.getByRole('tab', { name: 'Attendance' }))

    await screen.findByText('Priya Sharma')
    const priyaGroup = screen.getByRole('group', { name: /mark attendance for priya sharma/i })
    await user.click(within(priyaGroup).getByRole('button', { name: 'Present' }))
    await user.click(screen.getByRole('button', { name: /^save/i }))

    await waitFor(() => {
      expect(screen.getAllByText('Present').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: 'Finalize attendance' }))

    await waitFor(() => {
      expect(screen.getByText(/attendance is finalized/i)).toBeInTheDocument()
    })
    expect(screen.getAllByText('Absent').length).toBeGreaterThan(0)
  })
})
