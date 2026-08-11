import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateBatch, type UpdateBatchPayload } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useUpdateBatch(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateBatchPayload) => updateBatch(id, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(batchesKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}
