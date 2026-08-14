import { useQuery } from '@tanstack/react-query'

import {
  getMyAssessment,
  listMyAssessments,
} from '@/features/student-assessments/api/student-assessments.api'
import { studentAssessmentsKeys } from '@/features/student-assessments/api/query-keys'

export function useMyAssessments() {
  return useQuery({
    queryKey: studentAssessmentsKeys.lists(),
    queryFn: listMyAssessments,
  })
}

export function useMyAssessment(id: string | undefined) {
  return useQuery({
    queryKey: studentAssessmentsKeys.detail(id ?? ''),
    queryFn: () => getMyAssessment(id ?? ''),
    enabled: Boolean(id),
  })
}
