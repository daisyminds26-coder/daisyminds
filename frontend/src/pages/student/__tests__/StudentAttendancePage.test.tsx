import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import StudentAttendancePage from '@/pages/student/StudentAttendancePage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
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

  return renderWithProviders(<StudentAttendancePage />, {
    route: '/student/attendance',
    queryClient,
  })
}

describe('StudentAttendancePage', () => {
  it("shows the student's own attendance percentage per course and recent session records", async () => {
    await renderAsStudent()

    expect(await screen.findByText('Full-Stack Web Development')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText(/3 present · 0 late · 1 absent · 0 excused/i)).toBeInTheDocument()

    expect(screen.getByText('Week 3 — Recap')).toBeInTheDocument()
  })
})
