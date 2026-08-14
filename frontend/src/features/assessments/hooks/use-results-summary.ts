import { useQuery } from '@tanstack/react-query'

import { getResultsSummary } from '@/features/assessments/api/assessments.api'
import { assessmentsKeys } from '@/features/assessments/api/query-keys'

export function useResultsSummary(id: string) {
  return useQuery({
    queryKey: assessmentsKeys.results(id),
    queryFn: () => getResultsSummary(id),
    enabled: Boolean(id),
  })
}
