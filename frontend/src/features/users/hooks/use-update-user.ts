import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateUser } from '@/features/users/api/users.api'
import { usersKeys } from '@/features/users/api/query-keys'

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => updateUser(id, email),
    onSuccess: async (updated) => {
      queryClient.setQueryData(usersKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    },
  })
}
