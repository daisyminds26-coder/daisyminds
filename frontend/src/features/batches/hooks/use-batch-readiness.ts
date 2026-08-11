import { useMutation, useQuery } from '@tanstack/react-query'

import { checkReadiness } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

/** Read-only readiness snapshot for the detail page's "ready to schedule" panel. */
export function useBatchReadiness(id: string | undefined) {
  return useQuery({
    queryKey: batchesKeys.readiness(id ?? ''),
    queryFn: () => checkReadiness(id ?? ''),
    enabled: id !== undefined,
  })
}

/** Re-checks on demand (e.g. right before a manual "Schedule Batch" click) without needing a query invalidation. */
export function useCheckReadiness() {
  return useMutation({
    mutationFn: (id: string) => checkReadiness(id),
  })
}
