import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequireRole } from '@/shared/guards/require-role'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

function SettingsPage() {
  return <div>Settings page</div>
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

function renderGuardedRoute(queryClient: ReturnType<typeof createTestQueryClient>) {
  return renderWithProviders(
    <Routes>
      <Route path="/unauthorized" element={<UnauthorizedStub />} />
      <Route element={<RequireRole allowed={['SUPER_ADMIN']} />}>
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Route>
    </Routes>,
    { route: '/admin/settings', queryClient },
  )
}

describe('RequireRole', () => {
  it('denies a role not in the allow-list and redirects to /unauthorized', async () => {
    const queryClient = createTestQueryClient()
    // admin@example.com is seeded with role ADMIN, not SUPER_ADMIN.
    await loginAs('admin@example.com', queryClient)

    renderGuardedRoute(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    })
  })

  it('allows a role that is in the allow-list', async () => {
    const queryClient = createTestQueryClient()
    await loginAs('superadmin@example.com', queryClient)

    renderGuardedRoute(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Settings page')).toBeInTheDocument()
    })
  })
})
