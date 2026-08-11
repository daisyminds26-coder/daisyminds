import { useMutation } from '@tanstack/react-query'

import { changePassword, forgotPassword, resetPassword } from '@/features/auth/api/auth.api'

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      resetPassword(token, newPassword),
  })
}

/** Backend revokes every *other* session on success but keeps the current one alive — no local auth-state reset needed here. */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => changePassword(currentPassword, newPassword),
  })
}
