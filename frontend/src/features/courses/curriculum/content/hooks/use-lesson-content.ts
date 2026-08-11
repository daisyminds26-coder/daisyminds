import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  checkContentReadiness,
  getLessonContent,
  updateExternalLink,
  updateTextContent,
  type ExternalLinkPayload,
} from '@/features/courses/curriculum/content/api/lesson-content.api'
import { lessonContentKeys } from '@/features/courses/curriculum/content/api/query-keys'
import { curriculumKeys } from '@/features/courses/curriculum/api/query-keys'

export interface LessonContentParams {
  courseId: string
  moduleId: string
  lessonId: string
}

export function useLessonContent({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useQuery({
    queryKey: lessonContentKeys.detail(lessonId),
    queryFn: () => getLessonContent(courseId, moduleId, lessonId),
  })
}

export function useContentReadiness({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useQuery({
    queryKey: lessonContentKeys.readiness(lessonId),
    queryFn: () => checkContentReadiness(courseId, moduleId, lessonId),
  })
}

/** Every content mutation invalidates both this lesson's content and the curriculum tree — `contentStatus` is echoed on the tree's lesson rows (Curriculum Builder badges). */
function useInvalidateLessonContent(courseId: string, lessonId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: lessonContentKeys.all(lessonId) })
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(courseId) })
  }
}

export function useUpdateTextContent({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  return useMutation({
    mutationFn: (textContent: string) =>
      updateTextContent(courseId, moduleId, lessonId, textContent),
    onSuccess: invalidate,
  })
}

export function useUpdateExternalLink({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  return useMutation({
    mutationFn: (payload: ExternalLinkPayload) =>
      updateExternalLink(courseId, moduleId, lessonId, payload),
    onSuccess: invalidate,
  })
}
