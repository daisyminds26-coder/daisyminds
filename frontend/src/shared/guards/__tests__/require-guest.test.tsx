import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequireGuest } from '@/shared/guards/require-guest'
import { useLogin } from '@/features/auth/hooks/use-login'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

function GuestPage() {
  return <div>Login form</div>
}
function StudentDashboardStub() {
  return <div>Student dashboard</div>
}

describe('RequireGuest', () => {
  it('renders the guest page when unauthenticated', async () => {
    useAuthStore.setState({ status: 'unauthenticated', accessToken: null })
    renderWithProviders(
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<GuestPage />} />
        </Route>
      </Routes>,
      { route: '/login' },
    )

    await waitFor(() => {
      expect(screen.getByText('Login form')).toBeInTheDocument()
    })
  })

  it('redirects an authenticated user to their role dashboard', async () => {
    const queryClient = createTestQueryClient()
    function loginWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result: login } = renderHook(() => useLogin(), { wrapper: loginWrapper })
    act(() => {
      login.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
    })
    await waitFor(() => {
      expect(login.current.isSuccess).toBe(true)
    })

    renderWithProviders(
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<GuestPage />} />
        </Route>
        <Route path="/student" element={<StudentDashboardStub />} />
      </Routes>,
      { route: '/login', queryClient },
    )

    await waitFor(() => {
      expect(screen.getByText('Student dashboard')).toBeInTheDocument()
    })
  })
})
