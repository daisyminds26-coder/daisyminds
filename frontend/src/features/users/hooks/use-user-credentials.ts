import { useMutation } from '@tanstack/react-query'

import { resendVerification, triggerPasswordReset } from '@/features/users/api/users.api'

export function useTriggerPasswordReset() {
  return useMutation({
    mutationFn: (id: string) => triggerPasswordReset(id),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (id: string) => resendVerification(id),
  })
}
