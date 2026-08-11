import { useQuery } from '@tanstack/react-query'

import { getMe } from '@/features/auth/api/auth.api'
import { authKeys } from '@/features/auth/api/query-keys'
import { useAuthStore } from '@/features/auth/stores/auth-store'

/**
 * The single source of truth for the authenticated user's profile
 * (including `permissions`, which the login response body doesn't carry —
 * only `/me` does). Enabled only once an access token exists, so it never
 * fires a doomed request while `status` is `'loading'`/`'unauthenticated'`.
 */
export function useCurrentUser() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    enabled: accessToken !== null,
    staleTime: 60_000,
    retry: false,
  })
}
