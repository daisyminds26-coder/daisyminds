import { useQuery } from '@tanstack/react-query'

import { getConflicts } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

/** Trainer scheduling conflicts (availability + cross-batch) for the detail page's Overview tab. */
export function useBatchConflicts(id: string | undefined) {
  return useQuery({
    queryKey: batchesKeys.conflicts(id ?? ''),
    queryFn: () => getConflicts(id ?? ''),
    enabled: id !== undefined,
  })
}
