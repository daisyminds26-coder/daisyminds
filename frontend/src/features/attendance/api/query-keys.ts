import type { ListAttendanceParams } from '@/features/attendance/types'

export const attendanceKeys = {
  all: ['attendance'] as const,
  roster: (sessionId: string) => [...attendanceKeys.all, 'roster', sessionId] as const,
  report: (params: ListAttendanceParams) => [...attendanceKeys.all, 'report', params] as const,
  studentOverview: () => [...attendanceKeys.all, 'student-overview'] as const,
}
