import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createStudent, type CreateStudentPayload } from '@/features/students/api/students.api'

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => createStudent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students', 'list'] })
    },
  })
}
