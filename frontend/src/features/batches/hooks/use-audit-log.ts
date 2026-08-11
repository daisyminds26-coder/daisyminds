import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: batchesKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
