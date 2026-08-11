import { useQueries } from '@tanstack/react-query'

import { listBatches } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'
import type { BatchStatus } from '@/features/batches/types'

/**
 * No dedicated stats endpoint exists (deliberately — mirrors
 * `features/courses/hooks/use-course-stats.ts`'s "cheap `meta.total` of a
 * `limit: 1` list call" approach). Cards intentionally never surface an
 * enrolled/seat-count figure — the batch DTO has no such field (see
 * `features/batches/types/index.ts`'s `AdminBatch` — capacity is
 * configuration only).
 */
function buildCountQuery(filter: { status?: BatchStatus } = {}) {
  const params = { page: 1, limit: 1, ...filter }
  return {
    queryKey: batchesKeys.list(params),
    queryFn: () => listBatches(params),
  }
}

export function useBatchStats() {
  const results = useQueries({
    queries: [
      buildCountQuery(),
      buildCountQuery({ status: 'SCHEDULED' }),
      buildCountQuery({ status: 'ACTIVE' }),
      buildCountQuery({ status: 'DRAFT' }),
    ],
  })

  const [total, scheduled, active, draft] = results

  return {
    isLoading: results.some((result) => result.isLoading),
    total: total.data?.meta.total ?? 0,
    scheduled: scheduled.data?.meta.total ?? 0,
    active: active.data?.meta.total ?? 0,
    draft: draft.data?.meta.total ?? 0,
  }
}
