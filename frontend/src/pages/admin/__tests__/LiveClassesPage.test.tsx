import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import LiveClassesPage from '@/pages/admin/LiveClassesPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetLiveClassesMockState } from '@/test/msw/handlers/live-classes.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetLiveClassesMockState()
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

  return renderWithProviders(<LiveClassesPage />, { route: '/admin/live-classes', queryClient })
}

describe('LiveClassesPage', () => {
  it('lists every seeded session across statuses', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Week 1 — Introduction')).toBeInTheDocument()
    expect(screen.getByText('Week 2 — Live Session')).toBeInTheDocument()
    expect(screen.getByText('Week 0 — Orientation (cancelled)')).toBeInTheDocument()
  })

  it('filters the list by search text', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Week 2 — Live Session')
    await user.type(
      screen.getByPlaceholderText('Search by session title, session code…'),
      'Live Session',
    )

    await waitFor(() => {
      expect(screen.queryByText('Week 1 — Introduction')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Week 2 — Live Session')).toBeInTheDocument()
  })

  it('links each row to its detail page via "Manage"', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Week 2 — Live Session')
    const manageLinks = screen.getAllByRole('link', { name: /^Manage / })
    expect(manageLinks.length).toBeGreaterThan(0)
    expect(manageLinks[0]).toHaveAttribute('href', expect.stringContaining('/admin/live-classes/'))
  })
})
