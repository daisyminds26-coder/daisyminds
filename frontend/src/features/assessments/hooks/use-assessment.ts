import { useQuery } from '@tanstack/react-query'

import { getAssessment } from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: assessmentsKeys.detail(id ?? ''),
    queryFn: () => getAssessment(id ?? ''),
    enabled: Boolean(id),
  })
}
