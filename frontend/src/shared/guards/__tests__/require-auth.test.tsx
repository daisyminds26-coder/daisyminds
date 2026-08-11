import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequireAuth } from '@/shared/guards/require-auth'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

function ProtectedPage() {
  return <div>Protected content</div>
}
function LoginPageStub() {
  return <div>Login page</div>
}

function renderGuardedApp(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPageStub />} />
      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<ProtectedPage />} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('RequireAuth', () => {
  it('shows a loading state while status is loading', () => {
    useAuthStore.setState({ status: 'loading', accessToken: null })
    renderGuardedApp('/admin')

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', async () => {
    useAuthStore.setState({ status: 'unauthenticated', accessToken: null })
    renderGuardedApp('/admin')

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })

  it('renders protected content when authenticated', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'mock-token' })
    renderGuardedApp('/admin')

    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument()
    })
  })
})
