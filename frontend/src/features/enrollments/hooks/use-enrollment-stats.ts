import { useQueries } from '@tanstack/react-query'

import { listEnrollments } from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import type { EnrollmentStatus } from '@/features/enrollments/types'

/** No dedicated stats endpoint — mirrors `use-batch-stats.ts`'s "cheap `meta.total` of a `limit: 1` list call" approach. */
function buildCountQuery(status?: EnrollmentStatus) {
  const params = { page: 1, limit: 1, ...(status ? { status } : {}) }
  return { queryKey: enrollmentsKeys.list(params), queryFn: () => listEnrollments(params) }
}

export function useEnrollmentStats() {
  const results = useQueries({
    queries: [
      buildCountQuery('ACTIVE'),
      buildCountQuery('CONFIRMED'),
      buildCountQuery('WAITLISTED'),
      buildCountQuery('SUSPENDED'),
    ],
  })

  const [active, confirmed, waitlisted, suspended] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    active: active.data?.meta.total ?? 0,
    confirmed: confirmed.data?.meta.total ?? 0,
    waitlisted: waitlisted.data?.meta.total ?? 0,
    suspended: suspended.data?.meta.total ?? 0,
  }
}
