import { useQueries } from '@tanstack/react-query'

import { listStudents } from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'
import type { AccountStatus } from '@/features/auth/types'
import type { ProfileCompletionStatus } from '@/features/students/types'

/**
 * No dedicated stats endpoint exists (deliberately — mirrors the same
 * "cheap `meta.total` of a `limit: 1` list call" approach the users module
 * uses, see ARCHITECTURE.md's Admin User Management notes) — each figure is
 * the count from the same indexed/aggregated list query the table itself
 * already runs, just with a different filter and `limit: 1`.
 */
function buildCountQuery(
  filter: { status?: AccountStatus; profileCompletionStatus?: ProfileCompletionStatus } = {},
) {
  const params = { page: 1, limit: 1, ...filter }
  return {
    queryKey: studentsKeys.list(params),
    queryFn: () => listStudents(params),
  }
}

export function useStudentStats() {
  const results = useQueries({
    queries: [
      buildCountQuery(),
      buildCountQuery({ status: 'ACTIVE' }),
      buildCountQuery({ status: 'PENDING_VERIFICATION' }),
      buildCountQuery({ profileCompletionStatus: 'INCOMPLETE' }),
    ],
  })

  const [total, active, pending, incomplete] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    total: total.data?.meta.total ?? 0,
    active: active.data?.meta.total ?? 0,
    pending: pending.data?.meta.total ?? 0,
    incompleteProfiles: incomplete.data?.meta.total ?? 0,
  }
}
