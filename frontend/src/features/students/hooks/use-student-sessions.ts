import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  forceLogoutAll,
  forceLogoutSession,
  getStudentSessions,
} from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'
import type { AdminSessionSummary } from '@/features/students/types'

export function useStudentSessions(id: string) {
  return useQuery({
    queryKey: studentsKeys.sessions(id),
    queryFn: () => getStudentSessions(id),
  })
}

export function useForceLogoutSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => forceLogoutSession(id, sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<AdminSessionSummary[]>(studentsKeys.sessions(id), (previous) =>
        previous?.filter((session) => session.id !== sessionId),
      )
    },
  })
}

export function useForceLogoutAll(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => forceLogoutAll(id),
    onSuccess: () => {
      queryClient.setQueryData<AdminSessionSummary[]>(studentsKeys.sessions(id), [])
    },
  })
}
