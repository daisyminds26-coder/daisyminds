import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { useAuthSessionStore } from '@/shared/lib/auth-session-store'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/** Resets the shared, module-singleton auth store between tests. */
export function resetAuthStore(): void {
  useAuthSessionStore.setState({ status: 'loading', accessToken: null })
}

interface RenderOptions {
  route?: string
  queryClient?: QueryClient
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[options.route ?? '/']}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) }
}
