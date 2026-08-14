import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listAssessments } from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'
import type { ListAssessmentsParams } from '@/features/assessments/types'

export function useAssessmentsList(params: ListAssessmentsParams) {
  return useQuery({
    queryKey: assessmentsKeys.list(params),
    queryFn: () => listAssessments(params),
    placeholderData: keepPreviousData,
  })
}
