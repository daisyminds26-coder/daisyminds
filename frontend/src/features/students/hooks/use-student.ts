import { useQuery } from '@tanstack/react-query'

import { getStudent } from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentsKeys.detail(id ?? ''),
    queryFn: () => getStudent(id ?? ''),
    enabled: !!id,
  })
}
