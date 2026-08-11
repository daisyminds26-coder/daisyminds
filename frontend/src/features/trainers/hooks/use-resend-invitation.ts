import { useMutation } from '@tanstack/react-query'

import { resendInvitation } from '@/features/trainers/api/trainers.api'

export function useResendInvitation() {
  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
  })
}
