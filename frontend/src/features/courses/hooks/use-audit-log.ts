import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: coursesKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
