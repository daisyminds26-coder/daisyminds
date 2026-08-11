import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkAction } from '@/features/users/api/users.api'
import type { BulkAction } from '@/features/users/types'

export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, userIds }: { action: BulkAction; userIds: string[] }) =>
      bulkAction(action, userIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    },
  })
}
