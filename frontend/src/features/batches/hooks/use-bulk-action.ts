import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkAction } from '@/features/batches/api/batches.api'
import type { BatchBulkAction } from '@/features/batches/types'

export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, batchIds }: { action: BatchBulkAction; batchIds: string[] }) =>
      bulkAction(action, batchIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}
