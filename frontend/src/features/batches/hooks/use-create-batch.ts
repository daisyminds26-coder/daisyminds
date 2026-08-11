import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createBatch, type CreateBatchPayload } from '@/features/batches/api/batches.api'

export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBatchPayload) => createBatch(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}
