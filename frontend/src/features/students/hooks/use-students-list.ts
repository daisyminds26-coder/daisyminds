import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listStudents } from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'
import type { ListStudentsParams } from '@/features/students/types'

export function useStudentsList(params: ListStudentsParams) {
  return useQuery({
    queryKey: studentsKeys.list(params),
    queryFn: () => listStudents(params),
    placeholderData: keepPreviousData,
  })
}
