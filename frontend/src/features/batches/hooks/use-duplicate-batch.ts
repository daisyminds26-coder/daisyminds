import { useMutation, useQueryClient } from '@tanstack/react-query'

import { duplicateBatch, type DuplicateBatchPayload } from '@/features/batches/api/batches.api'

export function useDuplicateBatch(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DuplicateBatchPayload) => duplicateBatch(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}
