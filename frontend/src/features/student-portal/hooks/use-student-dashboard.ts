import { useQuery } from '@tanstack/react-query'

import { getStudentDashboard } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentDashboard() {
  return useQuery({
    queryKey: studentPortalKeys.dashboard(),
    queryFn: getStudentDashboard,
    staleTime: 30_000,
  })
}
