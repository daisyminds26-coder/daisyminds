import { useMutation, useQueryClient } from '@tanstack/react-query'

import { logout, logoutAll } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { setLoggingOut } from '@/shared/lib/api-client'
import { broadcastAuthEvent } from '@/shared/lib/multi-tab-sync'

function useLocalLogoutCleanup() {
  const queryClient = useQueryClient()
  const reset = useAuthStore((state) => state.reset)

  return async () => {
    await queryClient.cancelQueries()
    reset()
    queryClient.clear()
  }
}

/** Ends only the current session/device. */
export function useLogout() {
  const cleanup = useLocalLogoutCleanup()

  return useMutation({
    mutationFn: async () => {
      setLoggingOut(true)
      try {
        await logout()
      } finally {
        setLoggingOut(false)
      }
    },
    // Best-effort: even if the network call fails, there is nothing more
    // the frontend can do to revoke a server-side session it can't reach —
    // local state is cleared regardless so the UI never keeps showing
    // protected content past a logout attempt.
    onSettled: async () => {
      await cleanup()
      broadcastAuthEvent('LOGOUT')
    },
  })
}

/** Ends every session for the current user, across all devices. */
export function useLogoutAll() {
  const cleanup = useLocalLogoutCleanup()

  return useMutation({
    mutationFn: async () => {
      setLoggingOut(true)
      try {
        await logoutAll()
      } finally {
        setLoggingOut(false)
      }
    },
    onSettled: async () => {
      await cleanup()
      broadcastAuthEvent('LOGOUT_ALL')
    },
  })
}
