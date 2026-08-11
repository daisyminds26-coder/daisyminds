import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  archiveCourse,
  publishCourse,
  restoreCourse,
  softDeleteCourse,
  unpublishCourse,
} from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'
import type { AdminCourse } from '@/features/courses/types'

function useLifecycleMutation<TResult>(
  mutationFn: (id: string) => Promise<TResult>,
  applyToCache: (
    queryClient: ReturnType<typeof useQueryClient>,
    id: string,
    result: TResult,
  ) => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mutationFn(id),
    onSuccess: async (result, id) => {
      applyToCache(queryClient, id, result)
      await queryClient.invalidateQueries({ queryKey: ['courses', 'list'] })
    },
  })
}

export function usePublishCourse() {
  return useLifecycleMutation(publishCourse, (queryClient, id, updated: AdminCourse) => {
    queryClient.setQueryData(coursesKeys.detail(id), updated)
  })
}

export function useUnpublishCourse() {
  return useLifecycleMutation(unpublishCourse, (queryClient, id, updated: AdminCourse) => {
    queryClient.setQueryData(coursesKeys.detail(id), updated)
  })
}

export function useArchiveCourse() {
  return useLifecycleMutation(archiveCourse, (queryClient, id, updated: AdminCourse) => {
    queryClient.setQueryData(coursesKeys.detail(id), updated)
  })
}

export function useRestoreCourse() {
  return useLifecycleMutation(restoreCourse, (queryClient, id, updated: AdminCourse) => {
    queryClient.setQueryData(coursesKeys.detail(id), updated)
  })
}

export function useSoftDeleteCourse() {
  return useLifecycleMutation(softDeleteCourse, (queryClient, id) => {
    queryClient.removeQueries({ queryKey: coursesKeys.detail(id) })
  })
}
