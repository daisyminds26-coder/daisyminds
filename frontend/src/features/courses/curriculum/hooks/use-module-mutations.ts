import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  archiveModule,
  createModule,
  deleteModule,
  duplicateModule,
  publishModule,
  reorderModules,
  restoreModule,
  unpublishModule,
  updateModule,
  type CreateModulePayload,
  type UpdateModulePayload,
} from '@/features/courses/curriculum/api/curriculum.api'
import { curriculumKeys } from '@/features/courses/curriculum/api/query-keys'
import type { ReorderItem } from '@/features/courses/curriculum/types'

/** Every module/lesson mutation invalidates the whole tree — reorder/move/duplicate/delete-cascade all touch multiple documents at once, and a full-tree refetch after a structural write is simple, always-correct, and cheap at this scale (10-30 modules, 100-500 lessons) — no per-field optimistic cache surgery (performance guidance: "still invalidate after complex operations where consistency is more important"). */
function useInvalidateCurriculum(courseId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(courseId) })
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.readiness(courseId) })
  }
}

export function useCreateModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (payload: CreateModulePayload) => createModule(courseId, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: ({ moduleId, payload }: { moduleId: string; payload: UpdateModulePayload }) =>
      updateModule(courseId, moduleId, payload),
    onSuccess: invalidate,
  })
}

export function useReorderModules(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (items: ReorderItem[]) => reorderModules(courseId, items),
    onSuccess: invalidate,
  })
}

export function useArchiveModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => archiveModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}

export function useRestoreModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => restoreModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}

export function useDuplicateModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => duplicateModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}

export function usePublishModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => publishModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}

export function useUnpublishModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => unpublishModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}

export function useDeleteModule(courseId: string) {
  const invalidate = useInvalidateCurriculum(courseId)
  return useMutation({
    mutationFn: (moduleId: string) => deleteModule(courseId, moduleId),
    onSuccess: invalidate,
  })
}
