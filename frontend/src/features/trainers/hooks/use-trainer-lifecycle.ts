import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateTrainer,
  deactivateTrainer,
  restoreTrainer,
  softDeleteTrainer,
} from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'
import type { AdminTrainer } from '@/features/trainers/types'

function useLifecycleMutation<TResult>(
  mutationFn: (id: string) => Promise<TResult>,
  applyToCache: (
    queryClient: ReturnType<typeof useQueryClient>,
    id: string,
    result: TResult,
  ) => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => mutationFn(id),
    onSuccess: async (result, id) => {
      applyToCache(queryClient, id, result)
      await queryClient.invalidateQueries({ queryKey: ['trainers', 'list'] })
    },
  })
}

export function useActivateTrainer() {
  return useLifecycleMutation(activateTrainer, (queryClient, id, updated: AdminTrainer) => {
    queryClient.setQueryData(trainersKeys.detail(id), updated)
  })
}

export function useDeactivateTrainer() {
  return useLifecycleMutation(deactivateTrainer, (queryClient, id, updated: AdminTrainer) => {
    queryClient.setQueryData(trainersKeys.detail(id), updated)
  })
}

export function useSoftDeleteTrainer() {
  return useLifecycleMutation(softDeleteTrainer, (queryClient, id) => {
    queryClient.removeQueries({ queryKey: trainersKeys.detail(id) })
  })
}

export function useRestoreTrainer() {
  return useLifecycleMutation(restoreTrainer, (queryClient, id, updated: AdminTrainer) => {
    queryClient.setQueryData(trainersKeys.detail(id), updated)
  })
}
