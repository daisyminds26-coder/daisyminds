import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkAction } from '@/features/courses/api/courses.api'
import type { CourseBulkAction } from '@/features/courses/types'

export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, courseIds }: { action: CourseBulkAction; courseIds: string[] }) =>
      bulkAction(action, courseIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['courses', 'list'] })
    },
  })
}
