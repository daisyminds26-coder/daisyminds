import { useMutation } from '@tanstack/react-query'

import { resendInvitation } from '@/features/students/api/students.api'

export function useResendInvitation() {
  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
  })
}
