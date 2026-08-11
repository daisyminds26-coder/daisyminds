import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  bulkCancel,
  bulkResume,
  bulkSuspend,
  type BulkLifecycleActionPayload,
} from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import { batchesKeys } from '@/features/batches/api/query-keys'
import type { EnrollmentBulkLifecycleAction } from '@/features/enrollments/types'

const ACTIONS: Record<
  EnrollmentBulkLifecycleAction,
  (payload: BulkLifecycleActionPayload) => ReturnType<typeof bulkSuspend>
> = {
  suspend: bulkSuspend,
  resume: bulkResume,
  cancel: bulkCancel,
}

export function useBulkLifecycleAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      action,
      payload,
    }: {
      action: EnrollmentBulkLifecycleAction
      payload: BulkLifecycleActionPayload
    }) => ACTIONS[action](payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}
