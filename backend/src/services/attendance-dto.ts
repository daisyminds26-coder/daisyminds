import type { AttendanceSessionStatus } from '../models/live-class.model'
import type { AttendanceStatus } from '../models/attendance.model'
import type { EnrollmentStatus } from '../models/enrollment.model'

export type RosterAttendanceStatus = AttendanceStatus | 'UNMARKED'

export interface AttendanceRosterRowDto {
  studentId: string
  studentCode: string
  studentName: string
  enrollmentId: string
  enrollmentStatus: EnrollmentStatus
  attendanceId: string | null
  status: RosterAttendanceStatus
  checkInAt: string | null
  notes: string | null
}

export interface SessionAttendanceDto {
  sessionId: string
  sessionCode: string
  sessionTitle: string
  attendanceStatus: AttendanceSessionStatus
  attendanceFinalizedAt: string | null
  roster: AttendanceRosterRowDto[]
}

export interface StudentAttendanceSummaryDto {
  totalFinalizedSessions: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  attendancePercentage: number
}

export interface StudentAttendanceRecordDto {
  sessionId: string
  sessionTitle: string
  courseTitle: string
  batchName: string
  scheduledDate: string
  status: AttendanceStatus
}

export interface AdminAttendanceReportRowDto {
  sessionId: string
  sessionCode: string
  scheduledDate: string
  courseTitle: string
  batchName: string
  studentId: string
  studentCode: string
  studentName: string
  status: AttendanceStatus
}
