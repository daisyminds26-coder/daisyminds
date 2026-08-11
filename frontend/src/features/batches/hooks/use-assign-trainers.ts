import { useMutation, useQueryClient } from '@tanstack/react-query'

import { assignTrainers, type AssignTrainersPayload } from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useAssignTrainers(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AssignTrainersPayload) => assignTrainers(id, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(batchesKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: batchesKeys.conflicts(id) })
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}
