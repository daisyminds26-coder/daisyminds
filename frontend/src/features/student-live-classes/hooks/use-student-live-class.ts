import { useQuery } from '@tanstack/react-query'

import { getStudentLiveClass } from '@/features/student-live-classes/api/student-live-classes.api'
import { studentLiveClassesKeys } from '@/features/student-live-classes/api/query-keys'

export function useStudentLiveClass(id: string | undefined) {
  return useQuery({
    queryKey: studentLiveClassesKeys.detail(id ?? ''),
    queryFn: () => getStudentLiveClass(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: 60_000,
  })
}
