import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  cancelLiveClass,
  completeLiveClass,
  scheduleLiveClass,
  startLiveClass,
} from '@/features/live-classes/api/live-classes.api'
import { liveClassesKeys } from '@/features/live-classes/api/query-keys'
import type { AdminLiveClass } from '@/features/live-classes/types'

function useLifecycleMutation<TArgs>(mutationFn: (args: TArgs) => Promise<AdminLiveClass>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: async (updated) => {
      queryClient.setQueryData(liveClassesKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: liveClassesKeys.lists() })
    },
  })
}

export function useScheduleLiveClass() {
  return useLifecycleMutation((id: string) => scheduleLiveClass(id))
}

export function useStartLiveClass() {
  return useLifecycleMutation((id: string) => startLiveClass(id))
}

export function useCompleteLiveClass() {
  return useLifecycleMutation((id: string) => completeLiveClass(id))
}

export function useCancelLiveClass() {
  return useLifecycleMutation(({ id, reason }: { id: string; reason: string }) =>
    cancelLiveClass(id, reason),
  )
}
