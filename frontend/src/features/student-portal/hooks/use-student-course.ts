import { useQuery } from '@tanstack/react-query'

import { getStudentCourse } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

export function useStudentCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: studentPortalKeys.course(courseId ?? ''),
    queryFn: () => getStudentCourse(courseId ?? ''),
    enabled: Boolean(courseId),
  })
}
