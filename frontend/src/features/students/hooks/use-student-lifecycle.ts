import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateStudent,
  deactivateStudent,
  restoreStudent,
  softDeleteStudent,
} from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'
import type { AdminStudent } from '@/features/students/types'

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
      await queryClient.invalidateQueries({ queryKey: ['students', 'list'] })
    },
  })
}

export function useActivateStudent() {
  return useLifecycleMutation(activateStudent, (queryClient, id, updated: AdminStudent) => {
    queryClient.setQueryData(studentsKeys.detail(id), updated)
  })
}

export function useDeactivateStudent() {
  return useLifecycleMutation(deactivateStudent, (queryClient, id, updated: AdminStudent) => {
    queryClient.setQueryData(studentsKeys.detail(id), updated)
  })
}

export function useSoftDeleteStudent() {
  return useLifecycleMutation(softDeleteStudent, (queryClient, id) => {
    queryClient.removeQueries({ queryKey: studentsKeys.detail(id) })
  })
}

export function useRestoreStudent() {
  return useLifecycleMutation(restoreStudent, (queryClient, id, updated: AdminStudent) => {
    queryClient.setQueryData(studentsKeys.detail(id), updated)
  })
}
