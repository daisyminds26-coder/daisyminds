import { useQuery } from '@tanstack/react-query'

import { getBatch } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: batchesKeys.detail(id ?? ''),
    queryFn: () => getBatch(id ?? ''),
    enabled: id !== undefined,
  })
}
