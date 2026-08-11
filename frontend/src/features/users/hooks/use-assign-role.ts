import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assignRole } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'

export function useAssignRole(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) => assignRole(id, roleId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(usersKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    },
  })
}
