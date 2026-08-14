import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateStudentProfile } from '@/features/student-portal/api/student-portal.api'
import { studentPortalKeys } from '@/features/student-portal/api/query-keys'
import type { UpdateStudentProfilePayload } from '@/features/student-portal/types'

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateStudentProfilePayload) => updateStudentProfile(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentPortalKeys.profile() })
    },
  })
}
