import { useQuery } from '@tanstack/react-query'

import { getStudentProfile } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentProfile() {
  return useQuery({
    queryKey: studentPortalKeys.profile(),
    queryFn: getStudentProfile,
    staleTime: 30_000,
  })
}
