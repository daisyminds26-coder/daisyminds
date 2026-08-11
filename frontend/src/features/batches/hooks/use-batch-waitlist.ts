import { useQuery } from '@tanstack/react-query'

import { getBatchWaitlist } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useBatchWaitlist(id: string | undefined) {
  return useQuery({
    queryKey: batchesKeys.waitlist(id ?? ''),
    queryFn: () => getBatchWaitlist(id ?? ''),
    enabled: id !== undefined,
  })
}
