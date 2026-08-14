import { useMutation } from '@tanstack/react-query'

import { getLessonMediaUrl } from '@/features/learning-player/api/learning-player.api'

/**
 * A mutation, not a query — a signed media URL is short-lived (5-minute
 * expiry) and must never be treated as cacheable data. Video lessons
 * trigger this as soon as the player mounts (the "action" is opening the
 * lesson); document lessons trigger it on an explicit Open/Download click.
 * Never persisted to Zustand or localStorage.
 */
export function useLessonMediaUrl() {
  return useMutation({
    mutationFn: ({ courseId, lessonId }: { courseId: string; lessonId: string }) =>
      getLessonMediaUrl(courseId, lessonId),
  })
}
