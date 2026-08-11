import { useMutation } from '@tanstack/react-query'

import { resendVerification, verifyEmail } from '@/features/auth/api/auth.api'

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => verifyEmail(token),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => resendVerification(email),
  })
}
