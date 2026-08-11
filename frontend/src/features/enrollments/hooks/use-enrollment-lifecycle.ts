import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateEnrollment,
  cancelEnrollment,
  completeEnrollment,
  confirmEnrollment,
  dropEnrollment,
  promoteWaitlist,
  resumeEnrollment,
  suspendEnrollment,
  type CancelEnrollmentPayload,
  type DropEnrollmentPayload,
} from '@/features/enrollments/api/enrollments.api'
import { enrollmentsKeys } from '@/features/enrollments/api/query-keys'
import { batchesKeys } from '@/features/batches/api/query-keys'
import type { AdminEnrollment } from '@/features/enrollments/types'

/**
 * Every lifecycle action potentially changes seat consumption (confirm/
 * promote-waitlist/complete/cancel/drop do; activate/suspend/resume don't)
 * — rather than tracking which is which here (a second copy of the seat-
 * consuming-status rule `enrollment-lifecycle.util.ts` already owns
 * server-side), every action invalidates the batch's capacity/waitlist
 * alongside the enrollment itself. A little over-invalidation, never the
 * whole app cache.
 */
function useLifecycleMutation(mutationFn: (id: string) => Promise<AdminEnrollment>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; batchId: string }) => mutationFn(id),
    onSuccess: async (result, { id, batchId }) => {
      queryClient.setQueryData(enrollmentsKeys.detail(id), result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}

export function useConfirmEnrollment() {
  return useLifecycleMutation(confirmEnrollment)
}
export function usePromoteWaitlist() {
  return useLifecycleMutation(promoteWaitlist)
}
export function useActivateEnrollment() {
  return useLifecycleMutation(activateEnrollment)
}
export function useSuspendEnrollment() {
  return useLifecycleMutation(suspendEnrollment)
}
export function useResumeEnrollment() {
  return useLifecycleMutation(resumeEnrollment)
}
export function useCompleteEnrollment() {
  return useLifecycleMutation(completeEnrollment)
}

export function useCancelEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      batchId: string
      payload: CancelEnrollmentPayload
    }) => cancelEnrollment(id, payload),
    onSuccess: async (result, { id, batchId }) => {
      queryClient.setQueryData(enrollmentsKeys.detail(id), result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}

export function useDropEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      batchId: string
      payload: DropEnrollmentPayload
    }) => dropEnrollment(id, payload),
    onSuccess: async (result, { id, batchId }) => {
      queryClient.setQueryData(enrollmentsKeys.detail(id), result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.capacity(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.waitlist(batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKeys.all }),
      ])
    },
  })
}
