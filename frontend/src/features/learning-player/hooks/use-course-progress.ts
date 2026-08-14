import { useQuery } from '@tanstack/react-query'

import { getCourseProgress } from '@/features/learning-player/api/learning-player.api'
import { learningPlayerKeys } from '@/features/learning-player/api/query-keys'

export function useCourseProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: learningPlayerKeys.courseProgress(courseId ?? ''),
    queryFn: () => getCourseProgress(courseId ?? ''),
    enabled: Boolean(courseId),
  })
}
