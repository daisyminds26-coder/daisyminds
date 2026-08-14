import { useQuery } from '@tanstack/react-query'

import { getLessonDetail } from '@/features/learning-player/api/learning-player.api'
import { learningPlayerKeys } from '@/features/learning-player/api/query-keys'

export function useLessonDetail(courseId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: learningPlayerKeys.lesson(courseId ?? '', lessonId ?? ''),
    queryFn: () => getLessonDetail(courseId ?? '', lessonId ?? ''),
    enabled: Boolean(courseId) && Boolean(lessonId),
  })
}
