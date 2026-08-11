import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createTrainer, type CreateTrainerPayload } from '@/features/trainers/api/trainers.api'

export function useCreateTrainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTrainerPayload) => createTrainer(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trainers', 'list'] })
    },
  })
}
