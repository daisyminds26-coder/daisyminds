import { useQuery } from '@tanstack/react-query'

import {
  getMyAssessment,
  listMyAssessments,
} from '@/features/trainer-assessments/api/trainer-assessments.api'
import { trainerAssessmentsKeys } from '@/features/trainer-assessments/api/query-keys'

export function useMyAssessments() {
  return useQuery({
    queryKey: trainerAssessmentsKeys.lists(),
    queryFn: listMyAssessments,
  })
}

export function useMyAssessment(id: string | undefined) {
  return useQuery({
    queryKey: trainerAssessmentsKeys.detail(id ?? ''),
    queryFn: () => getMyAssessment(id ?? ''),
    enabled: Boolean(id),
  })
}
