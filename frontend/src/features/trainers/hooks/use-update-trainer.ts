import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateTrainer, type UpdateTrainerPayload } from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'

export function useUpdateTrainer(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateTrainerPayload) => updateTrainer(id, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(trainersKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['trainers', 'list'] })
    },
  })
}
