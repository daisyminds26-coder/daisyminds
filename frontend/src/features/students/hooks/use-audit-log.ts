import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: studentsKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
