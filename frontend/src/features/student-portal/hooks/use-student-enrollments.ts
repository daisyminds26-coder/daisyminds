import { useQuery } from '@tanstack/react-query'

import { listStudentEnrollments } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentEnrollments() {
  return useQuery({
    queryKey: studentPortalKeys.enrollments(),
    queryFn: listStudentEnrollments,
    staleTime: 30_000,
  })
}
