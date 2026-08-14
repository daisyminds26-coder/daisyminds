import { useQuery } from '@tanstack/react-query'

import { getSessionRoster } from '@/features/attendance/api/attendance.api'
import { attendanceKeys } from '@/features/attendance/api/query-keys'

export function useSessionRoster(sessionId: string | undefined, basePath = '/live-classes') {
  return useQuery({
    queryKey: attendanceKeys.roster(sessionId ?? ''),
    queryFn: () => getSessionRoster(sessionId ?? '', basePath),
    enabled: Boolean(sessionId),
  })
}
