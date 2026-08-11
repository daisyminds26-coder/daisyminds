import { useQueries } from '@tanstack/react-query'

import { listUsers } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'
import type { AccountStatus } from '@/features/auth/types'

/**
 * No dedicated stats endpoint exists (deliberately — see ARCHITECTURE.md's
 * User Management notes) — each figure is the `meta.total` of a `limit: 1`
 * list call with a status filter, which is cheap (the count comes from the
 * same indexed query the list endpoint already runs) and avoids adding a
 * bespoke aggregation endpoint for four numbers.
 */
function buildCountByStatusQuery(status?: AccountStatus) {
  return {
    queryKey: usersKeys.list({ page: 1, limit: 1, status }),
    queryFn: () => listUsers({ page: 1, limit: 1, status }),
  }
}

export function useUserStats() {
  const results = useQueries({
    queries: [
      buildCountByStatusQuery(undefined),
      buildCountByStatusQuery('ACTIVE'),
      buildCountByStatusQuery('PENDING_VERIFICATION'),
      buildCountByStatusQuery('LOCKED'),
    ],
  })

  const [total, active, pending, locked] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    total: total.data?.meta.total ?? 0,
    active: active.data?.meta.total ?? 0,
    pending: pending.data?.meta.total ?? 0,
    locked: locked.data?.meta.total ?? 0,
  }
}
