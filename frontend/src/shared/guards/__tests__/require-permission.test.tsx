import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequirePermission } from '@/shared/guards/require-permission'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

function UsersPage() {
  return <div>Users page</div>
}
function UnauthorizedStub() {
  return <div>Unauthorized</div>
}

function renderGuarded(required: string, queryClient: ReturnType<typeof createTestQueryClient>) {
  return renderWithProviders(
    <Routes>
      <Route path="/unauthorized" element={<UnauthorizedStub />} />
      <Route element={<RequirePermission required={required} />}>
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>
    </Routes>,
    { route: '/admin/users', queryClient },
  )
}

describe('RequirePermission', () => {
  it('allows a user who has the required permission', async () => {
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useLogin(), { wrapper })
    act(() => {
      // admin@example.com has 'users:read' and 'users:manage'.
      result.current.mutate({ email: 'admin@example.com', password: 'correct-horse-1' })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    renderGuarded('users:read', queryClient)

    await waitFor(() => {
      expect(screen.getByText('Users page')).toBeInTheDocument()
    })
  })

  it('denies a user missing the required permission', async () => {
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useLogin(), { wrapper })
    act(() => {
      // active@example.com only has 'courses:read'.
      result.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    renderGuarded('users:manage', queryClient)

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    })
  })
})
