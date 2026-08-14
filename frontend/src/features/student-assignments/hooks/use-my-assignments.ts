import { useQuery } from '@tanstack/react-query'

import { listMyAssignments } from '@/features/student-assignments/api/student-assignments.api'
import { studentAssignmentsKeys } from '@/features/student-assignments/api/query-keys'

export function useMyAssignments() {
  return useQuery({
    queryKey: studentAssignmentsKeys.list(),
    queryFn: listMyAssignments,
  })
}
