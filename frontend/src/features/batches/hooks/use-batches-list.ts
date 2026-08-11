import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listBatches } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'
import type { ListBatchesParams } from '@/features/batches/types'

export function useBatchesList(params: ListBatchesParams) {
  return useQuery({
    queryKey: batchesKeys.list(params),
    queryFn: () => listBatches(params),
    placeholderData: keepPreviousData,
  })
}
