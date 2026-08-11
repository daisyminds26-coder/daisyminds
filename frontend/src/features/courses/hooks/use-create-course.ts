import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createCourse, type CreateCoursePayload } from '@/features/courses/api/courses.api'

export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCoursePayload) => createCourse(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['courses', 'list'] })
    },
  })
}
