import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bulkMarkAttendance } from '@/features/attendance/api/attendance.api'
import { attendanceKeys } from '@/features/attendance/api/query-keys'
import type { BulkMarkAttendanceRecord } from '@/features/attendance/types'

export function useBulkMarkAttendance(sessionId: string, basePath = '/live-classes') {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (records: BulkMarkAttendanceRecord[]) =>
      bulkMarkAttendance(sessionId, records, basePath),
    onSuccess: (result) => {
      queryClient.setQueryData(attendanceKeys.roster(sessionId), result.roster)
    },
  })
}
