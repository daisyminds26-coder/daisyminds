import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getAuditLog } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'

export function useAuditLog(id: string, page: number) {
  return useQuery({
    queryKey: usersKeys.auditLog(id, page),
    queryFn: () => getAuditLog(id, page),
    placeholderData: keepPreviousData,
  })
}
