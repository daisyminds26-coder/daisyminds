import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import { liveClassRepository } from '../repositories/live-class.repository'
import {
  attendanceRepository,
  type ListAttendanceFilter,
} from '../repositories/attendance.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { studentRepository } from '../repositories/student.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { EnrollmentStatus } from '../models/enrollment.model'
import type { AttendanceStatus } from '../models/attendance.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import {
  type AdminAttendanceReportRowDto,
  type AttendanceRosterRowDto,
  type SessionAttendanceDto,
  type StudentAttendanceRecordDto,
  type StudentAttendanceSummaryDto,
} from './attendance-dto'

const AUDIT_ENTITY_TYPE = 'attendance'
const REPORT_MAX_ROWS = 5000
const STUDENT_HISTORY_LIMIT = 50

/**
 * Who is expected to attend a session — `ACTIVE`/`CONFIRMED` enrollments
 * only (task's own documented rule). `SUSPENDED` is deliberately excluded:
 * a student whose access is paused shouldn't be counted as expected to
 * show up. `WAITLISTED`/`CANCELLED`/`DROPPED`/`PENDING`/`COMPLETED` are
 * never eligible either — none of them represent a currently-participating
 * student.
 */
const ATTENDANCE_ELIGIBLE_STATUSES: readonly EnrollmentStatus[] = ['ACTIVE', 'CONFIRMED']

async function recordAudit(
  entityId: string,
  action: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function getSessionRoster(sessionId: string): Promise<SessionAttendanceDto> {
  const session = await liveClassRepository.findById(sessionId)
  if (!session) throw ApiError.notFound('Session not found')

  const eligibleEnrollments = await enrollmentRepository.findEligibleForBatch(
    session.batchId.toString(),
    ATTENDANCE_ELIGIBLE_STATUSES,
  )
  const studentIds = eligibleEnrollments.map((enrollment) => enrollment.studentId.toString())
  const [students, records] = await Promise.all([
    studentRepository.findByIds(studentIds),
    attendanceRepository.findAllBySession(sessionId),
  ])
  const studentById = new Map(students.map((student) => [student._id.toString(), student]))
  const recordByStudentId = new Map(records.map((record) => [record.studentId.toString(), record]))

  const roster: AttendanceRosterRowDto[] = []
  for (const enrollment of eligibleEnrollments) {
    const student = studentById.get(enrollment.studentId.toString())
    if (!student) continue
    const record = recordByStudentId.get(enrollment.studentId.toString())
    roster.push({
      studentId: student._id.toString(),
      studentCode: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      enrollmentId: enrollment._id.toString(),
      enrollmentStatus: enrollment.status,
      attendanceId: record ? record._id.toString() : null,
      status: record ? record.status : 'UNMARKED',
      checkInAt: record?.checkInAt ? record.checkInAt.toISOString() : null,
      notes: record ? record.notes : null,
    })
  }

  return {
    sessionId: session._id.toString(),
    sessionCode: session.sessionCode,
    sessionTitle: session.title,
    attendanceStatus: session.attendanceStatus,
    attendanceFinalizedAt: session.attendanceFinalizedAt
      ? session.attendanceFinalizedAt.toISOString()
      : null,
    roster,
  }
}

async function bulkMarkAttendance(
  sessionId: string,
  records: { studentId: string; status: AttendanceStatus; notes?: string }[],
  actor: AuthenticatedUser,
  context: RequestContext,
): Promise<{ roster: SessionAttendanceDto; rejected: { studentId: string; reason: string }[] }> {
  const session = await liveClassRepository.findById(sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  if (session.attendanceStatus === 'FINALIZED') {
    throw ApiError.conflict('Attendance is finalized — reopen it first to make changes')
  }

  const eligibleEnrollments = await enrollmentRepository.findEligibleForBatch(
    session.batchId.toString(),
    ATTENDANCE_ELIGIBLE_STATUSES,
  )
  const enrollmentByStudentId = new Map(
    eligibleEnrollments.map((enrollment) => [enrollment.studentId.toString(), enrollment]),
  )

  const validRecords: Parameters<typeof attendanceRepository.bulkUpsert>[0] = []
  const rejected: { studentId: string; reason: string }[] = []
  for (const record of records) {
    const enrollment = enrollmentByStudentId.get(record.studentId)
    if (!enrollment) {
      rejected.push({
        studentId: record.studentId,
        reason: 'Not an eligible student for this session',
      })
      continue
    }
    validRecords.push({
      sessionId,
      batchId: session.batchId.toString(),
      courseId: session.courseId.toString(),
      studentId: record.studentId,
      enrollmentId: enrollment._id.toString(),
      status: record.status,
      notes: record.notes ?? null,
      source: 'MANUAL',
    })
  }

  await attendanceRepository.bulkUpsert(validRecords)
  await recordAudit(sessionId, 'attendance.bulk_marked', actor, context, {
    markedCount: validRecords.length,
    rejectedCount: rejected.length,
  })

  return { roster: await getSessionRoster(sessionId), rejected }
}

async function finalizeAttendance(
  sessionId: string,
  actor: AuthenticatedUser,
  context: RequestContext,
): Promise<SessionAttendanceDto> {
  const session = await liveClassRepository.findById(sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  if (session.attendanceStatus === 'FINALIZED') {
    throw ApiError.conflict('Attendance is already finalized')
  }

  const eligibleEnrollments = await enrollmentRepository.findEligibleForBatch(
    session.batchId.toString(),
    ATTENDANCE_ELIGIBLE_STATUSES,
  )
  const existingRecords = await attendanceRepository.findAllBySession(sessionId)
  const markedStudentIds = new Set(existingRecords.map((record) => record.studentId.toString()))

  const toMarkAbsent = eligibleEnrollments.filter(
    (enrollment) => !markedStudentIds.has(enrollment.studentId.toString()),
  )
  if (toMarkAbsent.length > 0) {
    await attendanceRepository.bulkUpsert(
      toMarkAbsent.map((enrollment) => ({
        sessionId,
        batchId: session.batchId.toString(),
        courseId: session.courseId.toString(),
        studentId: enrollment.studentId.toString(),
        enrollmentId: enrollment._id.toString(),
        status: 'ABSENT' as const,
        source: 'SYSTEM' as const,
      })),
    )
  }

  await liveClassRepository.updateById(sessionId, {
    attendanceStatus: 'FINALIZED',
    attendanceFinalizedAt: new Date(),
    attendanceFinalizedBy: actor.id,
    updatedBy: actor.id,
  })

  await recordAudit(sessionId, 'attendance.finalized', actor, context, {
    autoMarkedAbsentCount: toMarkAbsent.length,
  })

  return getSessionRoster(sessionId)
}

async function reopenAttendance(
  sessionId: string,
  reason: string,
  actor: AuthenticatedUser,
  context: RequestContext,
): Promise<SessionAttendanceDto> {
  const session = await liveClassRepository.findById(sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  if (session.attendanceStatus !== 'FINALIZED') {
    throw ApiError.conflict('Attendance is not currently finalized')
  }

  await liveClassRepository.updateById(sessionId, {
    attendanceStatus: 'OPEN',
    attendanceFinalizedAt: null,
    attendanceFinalizedBy: null,
    updatedBy: actor.id,
  })

  await recordAudit(sessionId, 'attendance.reopened', actor, context, { reason })

  return getSessionRoster(sessionId)
}

async function getStudentAttendanceSummary(
  studentId: string,
  courseId: string,
): Promise<StudentAttendanceSummaryDto> {
  const [sessions, records] = await Promise.all([
    liveClassRepository.findFinalizedForCourse(courseId),
    attendanceRepository.findAllByStudent(studentId, courseId),
  ])
  const recordBySessionId = new Map(records.map((record) => [record.sessionId.toString(), record]))

  let present = 0
  let late = 0
  let absent = 0
  let excused = 0
  for (const session of sessions) {
    const record = recordBySessionId.get(session._id.toString())
    const status = record?.status ?? 'ABSENT'
    if (status === 'PRESENT') present += 1
    else if (status === 'LATE') late += 1
    else if (status === 'EXCUSED') excused += 1
    else absent += 1
  }

  const denominator = sessions.length - excused
  const attendancePercentage =
    denominator === 0 ? 0 : Math.round(((present + late) / denominator) * 100)

  return {
    totalFinalizedSessions: sessions.length,
    presentCount: present,
    lateCount: late,
    absentCount: absent,
    excusedCount: excused,
    attendancePercentage,
  }
}

async function listStudentAttendanceRecords(
  studentId: string,
  courseId?: string,
): Promise<StudentAttendanceRecordDto[]> {
  const records = await attendanceRepository.findAllByStudent(studentId, courseId)
  if (records.length === 0) return []

  const sessionIds = [...new Set(records.map((record) => record.sessionId.toString()))]
  const sessions = await liveClassRepository.findByIds(sessionIds)
  const sessionById = new Map(sessions.map((session) => [session._id.toString(), session]))

  const courseIds = [...new Set(sessions.map((session) => session.courseId.toString()))]
  const batchIds = [...new Set(sessions.map((session) => session.batchId.toString()))]
  const [courses, batches] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
  ])
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

  const rows: StudentAttendanceRecordDto[] = []
  for (const record of records) {
    const session = sessionById.get(record.sessionId.toString())
    if (!session) continue
    const course = courseById.get(session.courseId.toString())
    const batch = batchById.get(session.batchId.toString())
    rows.push({
      sessionId: session._id.toString(),
      sessionTitle: session.title,
      courseTitle: course?.title ?? '',
      batchName: batch?.name ?? '',
      scheduledDate: session.scheduledDate.toISOString(),
      status: record.status,
    })
  }

  return rows
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, STUDENT_HISTORY_LIMIT)
}

async function buildReportRows(
  filter: ListAttendanceFilter,
): Promise<AdminAttendanceReportRowDto[]> {
  const records = await attendanceRepository.listForExport(filter, REPORT_MAX_ROWS)
  if (records.length === 0) return []

  const sessionIds = [...new Set(records.map((record) => record.sessionId.toString()))]
  const studentIds = [...new Set(records.map((record) => record.studentId.toString()))]
  const [sessions, students] = await Promise.all([
    liveClassRepository.findByIds(sessionIds),
    studentRepository.findByIds(studentIds),
  ])
  const sessionById = new Map(sessions.map((session) => [session._id.toString(), session]))
  const studentById = new Map(students.map((student) => [student._id.toString(), student]))

  const courseIds = [...new Set(sessions.map((session) => session.courseId.toString()))]
  const batchIds = [...new Set(sessions.map((session) => session.batchId.toString()))]
  const [courses, batches] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
  ])
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

  const rows: AdminAttendanceReportRowDto[] = []
  for (const record of records) {
    const session = sessionById.get(record.sessionId.toString())
    const student = studentById.get(record.studentId.toString())
    if (!session || !student) continue
    const course = courseById.get(session.courseId.toString())
    const batch = batchById.get(session.batchId.toString())
    rows.push({
      sessionId: session._id.toString(),
      sessionCode: session.sessionCode,
      scheduledDate: session.scheduledDate.toISOString(),
      courseTitle: course?.title ?? '',
      batchName: batch?.name ?? '',
      studentId: student._id.toString(),
      studentCode: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      status: record.status,
    })
  }
  return rows
}

async function listAttendanceReport(
  filter: ListAttendanceFilter,
  page: number,
  limit: number,
): Promise<{
  data: AdminAttendanceReportRowDto[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}> {
  const rows = await buildReportRows(filter)
  const total = rows.length
  const start = (page - 1) * limit
  return {
    data: rows.slice(start, start + limit),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

async function exportAttendanceCsv(filter: ListAttendanceFilter): Promise<string> {
  const rows = await buildReportRows(filter)
  return toCsv(
    ['Session Code', 'Date', 'Course', 'Batch', 'Student ID', 'Student Name', 'Status'],
    rows.map((row) => [
      row.sessionCode,
      row.scheduledDate.slice(0, 10),
      row.courseTitle,
      row.batchName,
      row.studentCode,
      row.studentName,
      row.status,
    ]),
  )
}

export const attendanceService = {
  getSessionRoster,
  bulkMarkAttendance,
  finalizeAttendance,
  reopenAttendance,
  getStudentAttendanceSummary,
  listStudentAttendanceRecords,
  listAttendanceReport,
  exportAttendanceCsv,
}
