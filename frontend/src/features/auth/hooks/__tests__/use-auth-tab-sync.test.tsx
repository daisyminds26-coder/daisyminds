import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthTabSync } from '@/features/auth/hooks/use-auth-tab-sync'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { broadcastAuthEvent } from '@/shared/lib/multi-tab-sync'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthStore()
})

describe('useAuthTabSync', () => {
  it('clears local auth state and the query cache when another tab broadcasts a logout', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(['auth', 'me'], { id: 'user-1' })
    useAuthStore.setState({ status: 'authenticated', accessToken: 'a-token' })

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    renderHook(
      () => {
        useAuthTabSync()
      },
      { wrapper },
    )

    // A second BroadcastChannel instance simulates "another browser tab" —
    // `broadcastAuthEvent` in this same module scope would be suppressed by
    // the origin check, so a genuinely separate channel is required here.
    const otherTabChannel = new BroadcastChannel('daisy-minds-auth-sync')
    otherTabChannel.postMessage({ type: 'LOGOUT', origin: 'other-tab-id' })
    otherTabChannel.close()

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined()
  })

  it('ignores its own broadcasts (no self-triggered reset)', () => {
    const queryClient = createTestQueryClient()
    useAuthStore.setState({ status: 'authenticated', accessToken: 'a-token' })

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    renderHook(
      () => {
        useAuthTabSync()
      },
      { wrapper },
    )

    broadcastAuthEvent('LOGOUT')

    expect(useAuthStore.getState().status).toBe('authenticated')
  })
})
