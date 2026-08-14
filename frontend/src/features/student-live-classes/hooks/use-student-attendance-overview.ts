import { useQuery } from '@tanstack/react-query'

import { getStudentAttendanceOverview } from '@/features/student-live-classes/api/student-live-classes.api'
import { attendanceKeys } from '@/features/attendance/api/query-keys'

export function useStudentAttendanceOverview() {
  return useQuery({
    queryKey: attendanceKeys.studentOverview(),
    queryFn: getStudentAttendanceOverview,
  })
}
