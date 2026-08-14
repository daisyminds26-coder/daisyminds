import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateLessonProgress } from '@/features/learning-player/api/learning-player.api'
import { learningPlayerKeys } from '@/features/learning-player/api/query-keys'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'

/**
 * The video heartbeat — fires every ~10-15s while playing, on pause, and on
 * seek-complete (never every second). Only invalidates the wider progress
 * views (course progress, dashboard, my courses) when the response reports
 * a transition to `COMPLETED` — a plain position update has nothing for
 * those views to refresh, so most heartbeats invalidate nothing at all.
 */
export function useUpdateLessonProgress(courseId: string, lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (positionSeconds: number) =>
      updateLessonProgress(courseId, lessonId, positionSeconds),
    onSuccess: async (data) => {
      if (data.status !== 'COMPLETED') return
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
