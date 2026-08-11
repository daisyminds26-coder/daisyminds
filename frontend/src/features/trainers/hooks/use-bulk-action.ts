import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkAction } from '@/features/trainers/api/trainers.api'
import type { TrainerBulkAction } from '@/features/trainers/types'

export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, trainerIds }: { action: TrainerBulkAction; trainerIds: string[] }) =>
      bulkAction(action, trainerIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trainers', 'list'] })
    },
  })
}
