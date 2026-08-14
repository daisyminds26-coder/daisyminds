/** Mirrors `backend/src/models/attendance.model.ts#ATTENDANCE_STATUSES` exactly. */
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

/** A roster row before it's been touched shows `UNMARKED` — never a fabricated default (the backend never pre-marks anyone ABSENT before finalization). */
export type RosterAttendanceStatus = AttendanceStatus | 'UNMARKED'

export type EnrollmentStatus =
  | 'PENDING'
  | 'WAITLISTED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DROPPED'

export type AttendanceSessionStatus = 'OPEN' | 'FINALIZED'

export interface AttendanceRosterRow {
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

export interface SessionAttendance {
  sessionId: string
  sessionCode: string
  sessionTitle: string
  attendanceStatus: AttendanceSessionStatus
  attendanceFinalizedAt: string | null
  roster: AttendanceRosterRow[]
}

export interface BulkMarkAttendanceRecord {
  studentId: string
  status: AttendanceStatus
  notes?: string
}

export interface BulkMarkAttendanceResult {
  roster: SessionAttendance
  rejected: { studentId: string; reason: string }[]
}

export interface StudentAttendanceSummary {
  totalFinalizedSessions: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  attendancePercentage: number
}

export interface StudentAttendanceRecord {
  sessionId: string
  sessionTitle: string
  courseTitle: string
  batchName: string
  scheduledDate: string
  status: AttendanceStatus
}

export interface StudentCourseAttendance {
  courseId: string
  courseTitle: string
  summary: StudentAttendanceSummary
}

export interface StudentAttendanceOverview {
  courses: StudentCourseAttendance[]
  recentRecords: StudentAttendanceRecord[]
}

export interface AdminAttendanceReportRow {
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

export interface ListAttendanceParams {
  page?: number
  limit?: number
  batchId?: string
  courseId?: string
  studentId?: string
  sessionId?: string
  dateFrom?: string
  dateTo?: string
}
