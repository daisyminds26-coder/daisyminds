import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSessions, revokeSession } from '@/features/auth/api/auth.api'
import { authKeys } from '@/features/auth/api/query-keys'
import type { SessionSummary } from '@/features/auth/types'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { broadcastAuthEvent } from '@/shared/lib/multi-tab-sync'

export function useSessions() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: getSessions,
    enabled: accessToken !== null,
  })
}

/**
 * Revoking the *current* session invalidates it server-side immediately —
 * rather than leaving the UI live until the access token's natural (short)
 * expiry surfaces a confusing 401 later, this proactively clears local auth
 * state and lets `RequireAuth` redirect to login right away.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient()
  const reset = useAuthStore((state) => state.reset)

  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: async (_data, sessionId) => {
      const cached = queryClient.getQueryData<SessionSummary[]>(authKeys.sessions)
      const revoked = cached?.find((session) => session.id === sessionId)

      queryClient.setQueryData<SessionSummary[]>(authKeys.sessions, (previous) =>
        previous?.filter((session) => session.id !== sessionId),
      )

      if (revoked?.isCurrent) {
        await queryClient.cancelQueries()
        reset()
        queryClient.clear()
        broadcastAuthEvent('SESSION_INVALIDATED')
      }
    },
  })
}
