import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  archiveAssessment,
  cancelAssessment,
  closeAssessment,
  publishAssessment,
  publishResults,
} from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'
import type { AdminAssessment } from '@/features/assessments/types'

function useLifecycleMutation(mutationFn: (id: string) => Promise<AdminAssessment>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (updated) => {
      queryClient.setQueryData(assessmentsKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.lists() })
    },
  })
}

export function usePublishAssessment() {
  return useLifecycleMutation(publishAssessment)
}

export function useCloseAssessment() {
  return useLifecycleMutation(closeAssessment)
}

export function usePublishResults() {
  return useLifecycleMutation(publishResults)
}

export function useArchiveAssessment() {
  return useLifecycleMutation(archiveAssessment)
}

export function useCancelAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelAssessment(id, reason),
    onSuccess: async (updated) => {
      queryClient.setQueryData(assessmentsKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.lists() })
    },
  })
}
