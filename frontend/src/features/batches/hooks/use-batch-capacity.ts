import { useQuery } from '@tanstack/react-query'

import { getBatchCapacity } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useBatchCapacity(id: string | undefined) {
  return useQuery({
    queryKey: batchesKeys.capacity(id ?? ''),
    queryFn: () => getBatchCapacity(id ?? ''),
    enabled: id !== undefined,
  })
}
