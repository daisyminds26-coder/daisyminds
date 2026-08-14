import { useQuery } from '@tanstack/react-query'

import { getAssignment } from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: assignmentsKeys.detail(id ?? ''),
    queryFn: () => getAssignment(id ?? ''),
    enabled: Boolean(id),
  })
}
