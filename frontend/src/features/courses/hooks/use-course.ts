import { useQuery } from '@tanstack/react-query'

import { getCourse } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: coursesKeys.detail(id ?? ''),
    queryFn: () => getCourse(id ?? ''),
    enabled: id !== undefined,
  })
}
