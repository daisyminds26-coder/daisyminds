import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: trainersKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
