import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  forceLogoutAll,
  forceLogoutSession,
  getTrainerSessions,
} from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'
import type { AdminSessionSummary } from '@/features/trainers/types'

export function useTrainerSessions(id: string) {
  return useQuery({
    queryKey: trainersKeys.sessions(id),
    queryFn: () => getTrainerSessions(id),
  })
}

export function useForceLogoutSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => forceLogoutSession(id, sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<AdminSessionSummary[]>(trainersKeys.sessions(id), (previous) =>
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
      queryClient.setQueryData<AdminSessionSummary[]>(trainersKeys.sessions(id), [])
    },
  })
}
