import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listCourses } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'
import type { ListCoursesParams } from '@/features/courses/types'

export function useCoursesList(params: ListCoursesParams) {
  return useQuery({
    queryKey: coursesKeys.list(params),
    queryFn: () => listCourses(params),
    placeholderData: keepPreviousData,
  })
}
