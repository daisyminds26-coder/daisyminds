import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createUser, type CreateUserPayload } from '@/features/users/api/users.api'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: async () => {
      // Prefix match — invalidates every list query regardless of its filter/sort/page params.
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    },
  })
}
