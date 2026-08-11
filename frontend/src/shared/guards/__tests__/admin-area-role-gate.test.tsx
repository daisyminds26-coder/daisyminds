import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequireRole } from '@/shared/guards/require-role'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

/**
 * Regression test for a gap found while building User Management: `/admin`,
 * `/trainer`, `/student` previously had no role gate at all beyond
 * `RequireAuth` — any authenticated user (including a STUDENT) could reach
 * the admin shell. `app/router.tsx` now wraps each area in `RequireRole`.
 */

beforeEach(() => {
  resetAuthMockState()
})

function AdminUsersStub() {
  return <div>Admin users page</div>
}
function UnauthorizedStub() {
  return <div>Unauthorized</div>
}

async function loginAs(email: string, queryClient: ReturnType<typeof createTestQueryClient>) {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email, password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })
}

function renderAdminArea(queryClient: ReturnType<typeof createTestQueryClient>) {
  return renderWithProviders(
    <Routes>
      <Route path="/unauthorized" element={<UnauthorizedStub />} />
      <Route element={<RequireRole allowed={['SUPER_ADMIN', 'ADMIN']} />}>
        <Route path="/admin/users" element={<AdminUsersStub />} />
      </Route>
    </Routes>,
    { route: '/admin/users', queryClient },
  )
}

describe('admin area role gate', () => {
  it('allows an ADMIN into the admin area', async () => {
    resetAuthStore()
    const queryClient = createTestQueryClient()
    await loginAs('admin@example.com', queryClient)

    renderAdminArea(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Admin users page')).toBeInTheDocument()
    })
  })

  it('blocks a STUDENT from the admin area (the gap this test guards against)', async () => {
    resetAuthStore()
    const queryClient = createTestQueryClient()
    await loginAs('active@example.com', queryClient)

    renderAdminArea(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    })
  })
})
