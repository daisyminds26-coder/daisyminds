import { useQuery } from '@tanstack/react-query'

import { listStudentLiveClasses } from '@/features/student-live-classes/api/student-live-classes.api'
import { studentLiveClassesKeys } from '@/features/student-live-classes/api/query-keys'

/** Refetches on a short interval while mounted — the only real-time-ish signal this phase needs (`canJoin` flips true 15 minutes before start; no websocket/polling infra exists yet for anything fancier). */
export function useStudentLiveClasses() {
  return useQuery({
    queryKey: studentLiveClassesKeys.list(),
    queryFn: listStudentLiveClasses,
    refetchInterval: 60_000,
  })
}
