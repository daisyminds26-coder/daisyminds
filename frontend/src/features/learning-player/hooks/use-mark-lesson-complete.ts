import { useMutation, useQueryClient } from '@tanstack/react-query'

import { markLessonComplete } from '@/features/learning-player/api/learning-player.api'
import { learningPlayerKeys } from '@/features/learning-player/api/query-keys'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

/** Cross-feature invalidation on completion — same "invalidate every view the change is visible in" precedent `features/enrollments` set for `batchesKeys` (ARCHITECTURE.md §24). Completing a lesson can change course progress, curriculum lock state, and every progress bar showing this course. */
export function useMarkLessonComplete(courseId: string, lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markLessonComplete(courseId, lessonId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningPlayerKeys.lesson(courseId, lessonId) }),
        queryClient.invalidateQueries({ queryKey: learningPlayerKeys.courseProgress(courseId) }),
        queryClient.invalidateQueries({ queryKey: studentPortalKeys.course(courseId) }),
        queryClient.invalidateQueries({ queryKey: studentPortalKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: studentPortalKeys.enrollments() }),
      ])
    },
  })
}
