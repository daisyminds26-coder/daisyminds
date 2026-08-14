import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listAssignments } from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'
import type { ListAssignmentsParams } from '@/features/assignments/types'

export function useAssignmentsList(params: ListAssignmentsParams) {
  return useQuery({
    queryKey: assignmentsKeys.list(params),
    queryFn: () => listAssignments(params),
    placeholderData: keepPreviousData,
  })
}
