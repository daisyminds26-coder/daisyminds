import { useQueries } from '@tanstack/react-query'

import { listTrainers } from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'
import type { AccountStatus } from '@/features/auth/types'
import type { AvailabilityStatus } from '@/features/trainers/types'

/** No dedicated stats endpoint exists (deliberately — mirrors the users/students modules' "cheap `meta.total` of a `limit: 1` list call" approach). */
function buildCountQuery(
  filter: { status?: AccountStatus; availabilityStatus?: AvailabilityStatus } = {},
) {
  const params = { page: 1, limit: 1, ...filter }
  return {
    queryKey: trainersKeys.list(params),
    queryFn: () => listTrainers(params),
  }
}

export function useTrainerStats() {
  const results = useQueries({
    queries: [
      buildCountQuery(),
      buildCountQuery({ status: 'ACTIVE' }),
      buildCountQuery({ status: 'PENDING_VERIFICATION' }),
      buildCountQuery({ availabilityStatus: 'AVAILABLE' }),
    ],
  })

  const [total, active, pending, available] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    total: total.data?.meta.total ?? 0,
    active: active.data?.meta.total ?? 0,
    pending: pending.data?.meta.total ?? 0,
    available: available.data?.meta.total ?? 0,
  }
}
