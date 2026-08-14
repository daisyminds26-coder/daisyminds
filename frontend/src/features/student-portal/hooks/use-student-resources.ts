import { useQuery } from '@tanstack/react-query'

import { listStudentResources } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentResources() {
  return useQuery({
    queryKey: studentPortalKeys.resources(),
    queryFn: listStudentResources,
    staleTime: 30_000,
  })
}
