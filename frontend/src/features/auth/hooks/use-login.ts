import { useMutation, useQueryClient } from '@tanstack/react-query'

import { login } from '@/features/auth/api/auth.api'
import { authKeys } from '@/features/auth/api/query-keys'
import { useAuthStore } from '@/features/auth/stores/auth-store'

export function useLogin() {
  const queryClient = useQueryClient()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const setStatus = useAuthStore((state) => state.setStatus)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: async (result) => {
      setAccessToken(result.accessToken)
      setStatus('authenticated')
      // Login's response doesn't include `permissions` (only `/me` does) —
      // invalidate so the canonical profile query refetches immediately.
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}
