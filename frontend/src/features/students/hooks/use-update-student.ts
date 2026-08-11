import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateStudent, type UpdateStudentPayload } from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateStudentPayload) => updateStudent(id, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(studentsKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['students', 'list'] })
    },
  })
}
