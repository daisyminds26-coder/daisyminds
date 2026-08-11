import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateUser,
  deactivateUser,
  restoreUser,
  softDeleteUser,
} from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'
import type { AdminUser } from '@/features/users/types'

function useLifecycleMutation<TResult>(
  mutationFn: (id: string) => Promise<TResult>,
  applyToCache: (
    queryClient: ReturnType<typeof useQueryClient>,
    id: string,
    result: TResult,
  ) => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mutationFn(id),
    onSuccess: async (result, id) => {
      applyToCache(queryClient, id, result)
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    },
  })
}

export function useActivateUser() {
  return useLifecycleMutation(activateUser, (queryClient, id, updated: AdminUser) => {
    queryClient.setQueryData(usersKeys.detail(id), updated)
  })
}

export function useDeactivateUser() {
  return useLifecycleMutation(deactivateUser, (queryClient, id, updated: AdminUser) => {
    queryClient.setQueryData(usersKeys.detail(id), updated)
  })
}

export function useSoftDeleteUser() {
  return useLifecycleMutation(softDeleteUser, (queryClient, id) => {
    queryClient.removeQueries({ queryKey: usersKeys.detail(id) })
  })
}

export function useRestoreUser() {
  return useLifecycleMutation(restoreUser, (queryClient, id, updated: AdminUser) => {
    queryClient.setQueryData(usersKeys.detail(id), updated)
  })
}
