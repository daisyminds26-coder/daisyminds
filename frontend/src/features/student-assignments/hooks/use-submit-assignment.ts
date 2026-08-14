import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  saveDraft,
  submitAssignment,
} from '@/features/student-assignments/api/student-assignments.api'
import { studentAssignmentsKeys } from '@/features/student-assignments/api/query-keys'

export function useSaveDraft(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { textResponse?: string; linkResponse?: string }) =>
      saveDraft(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsKeys.detail(assignmentId) })
      await queryClient.invalidateQueries({
        queryKey: studentAssignmentsKeys.history(assignmentId),
      })
    },
  })
}

export function useSubmitAssignment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { textResponse?: string; linkResponse?: string }) =>
      submitAssignment(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsKeys.detail(assignmentId) })
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsKeys.list() })
      await queryClient.invalidateQueries({
        queryKey: studentAssignmentsKeys.history(assignmentId),
      })
    },
  })
}
