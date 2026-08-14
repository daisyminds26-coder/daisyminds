import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  completeMyLiveClass,
  startMyLiveClass,
} from '@/features/trainer-live-classes/api/trainer-live-classes.api'
import { trainerLiveClassesKeys } from '@/features/trainer-live-classes/api/query-keys'

export function useStartMyLiveClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startMyLiveClass,
    onSuccess: async (updated) => {
      queryClient.setQueryData(trainerLiveClassesKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: trainerLiveClassesKeys.all })
    },
  })
}

export function useCompleteMyLiveClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: completeMyLiveClass,
    onSuccess: async (updated) => {
      queryClient.setQueryData(trainerLiveClassesKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: trainerLiveClassesKeys.all })
    },
  })
}
