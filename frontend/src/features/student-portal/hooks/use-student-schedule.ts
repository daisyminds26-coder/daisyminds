import { useQuery } from '@tanstack/react-query'

import { listStudentSchedule } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentSchedule() {
  return useQuery({
    queryKey: studentPortalKeys.schedule(),
    queryFn: listStudentSchedule,
    staleTime: 30_000,
  })
}
