import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { forceLogoutAll, forceLogoutSession, getUserSessions } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'
import type { AdminUserSession } from '@/features/users/types'

export function useUserSessions(id: string) {
  return useQuery({
    queryKey: usersKeys.sessions(id),
    queryFn: () => getUserSessions(id),
  })
}

export function useForceLogoutSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => forceLogoutSession(id, sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<AdminUserSession[]>(usersKeys.sessions(id), (previous) =>
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
      queryClient.setQueryData<AdminUserSession[]>(usersKeys.sessions(id), [])
    },
  })
}
