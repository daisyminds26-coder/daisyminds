import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createAssignment, updateAssignment } from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'
import type { AdminAssignment, CreateAssignmentPayload } from '@/features/assignments/types'

export function useCreateAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsKeys.lists() })
    },
  })
}

export function useUpdateAssignment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CreateAssignmentPayload>) => updateAssignment(id, payload),
    onSuccess: async (updated: AdminAssignment) => {
      queryClient.setQueryData(assignmentsKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: assignmentsKeys.lists() })
    },
  })
}
