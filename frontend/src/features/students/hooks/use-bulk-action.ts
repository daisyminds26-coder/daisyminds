import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkAction } from '@/features/students/api/students.api'
import type { StudentBulkAction } from '@/features/students/types'

export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, studentIds }: { action: StudentBulkAction; studentIds: string[] }) =>
      bulkAction(action, studentIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students', 'list'] })
    },
  })
}
