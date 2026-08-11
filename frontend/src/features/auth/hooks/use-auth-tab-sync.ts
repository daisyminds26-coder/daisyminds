import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/stores/auth-store'
import { subscribeToAuthEvents } from '@/shared/lib/multi-tab-sync'

/**
 * Applies another tab's logout/session-invalidation locally — does not
 * re-broadcast (the originating tab already did) and does not call any
 * `/auth/*` endpoint (that tab already did, or the session is already dead
 * server-side).
 */
export function useAuthTabSync(): void {
  const reset = useAuthStore((state) => state.reset)
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeToAuthEvents(() => {
      reset()
      queryClient.clear()
    })
  }, [reset, queryClient])
}
