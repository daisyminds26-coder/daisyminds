import { useMutation, useQueryClient } from '@tanstack/react-query'

import { finalizeAttendance, reopenAttendance } from '@/features/attendance/api/attendance.api'
import { attendanceKeys } from '@/features/attendance/api/query-keys'

export function useFinalizeAttendance(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => finalizeAttendance(sessionId),
    onSuccess: (updated) => {
      queryClient.setQueryData(attendanceKeys.roster(sessionId), updated)
    },
  })
}

export function useReopenAttendance(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) => reopenAttendance(sessionId, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(attendanceKeys.roster(sessionId), updated)
    },
  })
}
