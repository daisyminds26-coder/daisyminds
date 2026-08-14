import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createLiveClass } from '@/features/live-classes/api/live-classes.api'
import { liveClassesKeys } from '@/features/live-classes/api/query-keys'

export function useCreateLiveClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLiveClass,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: liveClassesKeys.lists() })
    },
  })
}
