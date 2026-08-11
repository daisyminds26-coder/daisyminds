import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listEnrollments } from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import type { ListEnrollmentsParams } from '@/features/enrollments/types'

export function useEnrollmentsList(params: ListEnrollmentsParams) {
  return useQuery({
    queryKey: enrollmentsKeys.list(params),
    queryFn: () => listEnrollments(params),
    placeholderData: keepPreviousData,
  })
}
