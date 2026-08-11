import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateBatch,
  archiveBatch,
  cancelBatch,
  completeBatch,
  restoreBatch,
  scheduleBatch,
  softDeleteBatch,
  unscheduleBatch,
} from '@/features/batches/api/batches.api'
import { batchesKeys } from '@/features/batches/api/query-keys'
import type { AdminBatch } from '@/features/batches/types'

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
      await queryClient.invalidateQueries({ queryKey: ['batches', 'list'] })
    },
  })
}

export function useScheduleBatch() {
  return useLifecycleMutation(scheduleBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useUnscheduleBatch() {
  return useLifecycleMutation(unscheduleBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useActivateBatch() {
  return useLifecycleMutation(activateBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useCompleteBatch() {
  return useLifecycleMutation(completeBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useCancelBatch() {
  return useLifecycleMutation(cancelBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useArchiveBatch() {
  return useLifecycleMutation(archiveBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useRestoreBatch() {
  return useLifecycleMutation(restoreBatch, (queryClient, id, updated: AdminBatch) => {
    queryClient.setQueryData(batchesKeys.detail(id), updated)
  })
}

export function useSoftDeleteBatch() {
  return useLifecycleMutation(softDeleteBatch, (queryClient, id) => {
    queryClient.removeQueries({ queryKey: batchesKeys.detail(id) })
  })
}
