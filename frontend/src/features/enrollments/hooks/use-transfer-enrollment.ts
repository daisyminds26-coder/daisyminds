import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  transferEnrollment,
  type TransferEnrollmentPayload,
} from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useTransferEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      sourceBatchId: string
      payload: TransferEnrollmentPayload
    }) => transferEnrollment(id, payload),
    onSuccess: async (_result, { id, sourceBatchId, payload }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(sourceBatchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(sourceBatchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(payload.targetBatchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(payload.targetBatchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}
