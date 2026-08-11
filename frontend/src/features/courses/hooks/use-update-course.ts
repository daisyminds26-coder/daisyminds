import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateCourse, type UpdateCoursePayload } from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'

export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCoursePayload) => updateCourse(id, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(coursesKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: ['courses', 'list'] })
    },
  })
}
