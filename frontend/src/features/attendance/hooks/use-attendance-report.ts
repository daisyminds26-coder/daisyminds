import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listAttendanceReport } from '@/features/attendance/api/attendance.api'
import { attendanceKeys } from '@/features/attendance/api/query-keys'
import type { ListAttendanceParams } from '@/features/attendance/types'

export function useAttendanceReport(params: ListAttendanceParams) {
  return useQuery({
    queryKey: attendanceKeys.report(params),
    queryFn: () => listAttendanceReport(params),
    placeholderData: keepPreviousData,
  })
}
