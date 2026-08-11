import { useQuery } from '@tanstack/react-query'

import { getCourseLaunchReadiness } from '@/features/courses/curriculum/content/api/lesson-content.api'
import { launchReadinessKeys } from '@/features/courses/curriculum/content/api/query-keys'

export function useCourseLaunchReadiness(courseId: string | undefined) {
  return useQuery({
    queryKey: launchReadinessKeys.detail(courseId ?? ''),
    queryFn: () => getCourseLaunchReadiness(courseId ?? ''),
    enabled: courseId !== undefined,
  })
}
