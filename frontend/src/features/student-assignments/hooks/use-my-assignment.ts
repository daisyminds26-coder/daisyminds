import { useQuery } from '@tanstack/react-query'

import {
  getMyAssignment,
  getMyAttemptHistory,
} from '@/features/student-assignments/api/student-assignments.api'
import { studentAssignmentsKeys } from '@/features/student-assignments/api/query-keys'

export function useMyAssignment(id: string | undefined) {
  return useQuery({
    queryKey: studentAssignmentsKeys.detail(id ?? ''),
    queryFn: () => getMyAssignment(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useMyAttemptHistory(id: string | undefined) {
  return useQuery({
    queryKey: studentAssignmentsKeys.history(id ?? ''),
    queryFn: () => getMyAttemptHistory(id ?? ''),
    enabled: Boolean(id),
  })
}
