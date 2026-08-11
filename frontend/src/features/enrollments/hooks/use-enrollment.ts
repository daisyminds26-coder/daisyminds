import { useQuery } from '@tanstack/react-query'

import { getEnrollment } from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'

export function useEnrollment(id: string | undefined) {
  return useQuery({
    queryKey: enrollmentsKeys.detail(id ?? ''),
    queryFn: () => getEnrollment(id ?? ''),
    enabled: id !== undefined,
  })
}
