import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createAssessment,
  replaceSections,
  updateAssessment,
} from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'
import type {
  AdminAssessment,
  SectionInputPayload,
  UpdateAssessmentPayload,
} from '@/features/assessments/types'

export function useCreateAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAssessment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.lists() })
    },
  })
}

export function useUpdateAssessment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateAssessmentPayload) => updateAssessment(id, payload),
    onSuccess: async (updated: AdminAssessment) => {
      queryClient.setQueryData(assessmentsKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.lists() })
    },
  })
}

export function useReplaceSections(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sections: SectionInputPayload[]) => replaceSections(id, sections),
    onSuccess: async (updated: AdminAssessment) => {
      queryClient.setQueryData(assessmentsKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: assessmentsKeys.readiness(id) })
    },
  })
}
