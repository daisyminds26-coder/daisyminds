import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import StudentCreatePage from '@/pages/admin/StudentCreatePage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetStudentsMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin() {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email: 'superadmin@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(<StudentCreatePage />, { route: '/admin/students/new', queryClient })
}

describe('StudentCreatePage', () => {
  it('renders the create-student wizard on its own page', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByRole('heading', { name: 'Create student' })).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('links back to the students list', async () => {
    await renderAsSuperAdmin()

    await screen.findByRole('heading', { name: 'Create student' })
    expect(screen.getByRole('link', { name: /back to students/i })).toHaveAttribute(
      'href',
      '/admin/students',
    )
  })
})
