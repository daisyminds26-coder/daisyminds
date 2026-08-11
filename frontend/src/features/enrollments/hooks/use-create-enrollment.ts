import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createEnrollment,
  type CreateEnrollmentPayload,
} from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import { batchesKeys } from '@/features/batches/api/query-keys'

export function useCreateEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateEnrollmentPayload) => createEnrollment(payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(variables.batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(variables.batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.detail(variables.batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}
