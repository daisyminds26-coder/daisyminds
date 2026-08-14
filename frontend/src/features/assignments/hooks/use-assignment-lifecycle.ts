import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  archiveAssignment,
  cancelAssignment,
  closeAssignment,
  publishAssignment,
} from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'
import type { AdminAssignment } from '@/features/assignments/types'

function useLifecycleMutation<TArgs>(mutationFn: (args: TArgs) => Promise<AdminAssignment>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (updated) => {
      queryClient.setQueryData(assignmentsKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: assignmentsKeys.lists() })
    },
  })
}

export function usePublishAssignment() {
  return useLifecycleMutation((id: string) => publishAssignment(id))
}

export function useCloseAssignment() {
  return useLifecycleMutation((id: string) => closeAssignment(id))
}

export function useArchiveAssignment() {
  return useLifecycleMutation((id: string) => archiveAssignment(id))
}

export function useCancelAssignment() {
  return useLifecycleMutation(({ id, reason }: { id: string; reason: string }) =>
    cancelAssignment(id, reason),
  )
}
