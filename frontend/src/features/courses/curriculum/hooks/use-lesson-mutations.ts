import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  archiveLesson,
  createLesson,
  deleteLesson,
  duplicateLesson,
  moveLesson,
  publishLesson,
  reorderLessons,
  restoreLesson,
  unpublishLesson,
  updateLesson,
  type CreateLessonPayload,
  type UpdateLessonPayload,
} from '@/features/courses/curriculum/api/curriculum.api'
import { curriculumKeys } from '@/features/courses/curriculum/api/query-keys'
import type { ReorderItem } from '@/features/courses/curriculum/types'

function useInvalidateCurriculum(courseId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(courseId) })
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.readiness(courseId) })
  }
}

export function useCreateLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, payload }: { moduleId: string; payload: CreateLessonPayload }) =>
      createLesson(courseId, moduleId, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({
      moduleId,
      lessonId,
      payload,
    }: {
      moduleId: string
      lessonId: string
      payload: UpdateLessonPayload
    }) => updateLesson(courseId, moduleId, lessonId, payload),
    onSuccess: invalidate,
  })
}

export function useReorderLessons(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, items }: { moduleId: string; items: ReorderItem[] }) =>
      reorderLessons(courseId, moduleId, items),
    onSuccess: invalidate,
  })
}

export function useMoveLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({
      lessonId,
      targetModuleId,
      targetOrder,
    }: {
      lessonId: string
      targetModuleId: string
      targetOrder: number
    }) => moveLesson(courseId, lessonId, targetModuleId, targetOrder),
    onSuccess: invalidate,
  })
}

export function useArchiveLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      archiveLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function useRestoreLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      restoreLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function useDuplicateLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      duplicateLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function usePublishLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      publishLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function useUnpublishLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      unpublishLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function useDeleteLesson(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      deleteLesson(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}
