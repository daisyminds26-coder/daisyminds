import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: enrollmentsKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
