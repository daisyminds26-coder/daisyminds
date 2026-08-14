import { Types } from 'mongoose'

import {
  AttendanceModel,
  type IAttendance,
  type AttendanceDocument,
  type AttendanceStatus,
} from '../models/attendance.model'

export interface UpsertAttendanceInput {
  sessionId: string
  batchId: string
  courseId: string
  studentId: string
  enrollmentId: string
  status: AttendanceStatus
  notes?: string | null
  source: IAttendance['source']
}

export interface ListAttendanceFilter {
  batchId?: string
  courseId?: string
  studentId?: string
  sessionId?: string
  dateFrom?: Date
  dateTo?: Date
}

export const attendanceRepository = {
  findBySessionAndStudent(
    sessionId: string,
    studentId: string,
  ): Promise<AttendanceDocument | null> {
    return AttendanceModel.findOne({ sessionId, studentId })
  },

  findAllBySession(sessionId: string): Promise<AttendanceDocument[]> {
    return AttendanceModel.find({ sessionId })
  },

  /** Every attendance row a student has, optionally scoped to a course — the attendance-percentage aggregation's own read. */
  findAllByStudent(studentId: string, courseId?: string): Promise<AttendanceDocument[]> {
    const query: Record<string, unknown> = { studentId }
    if (courseId) query.courseId = courseId
    return AttendanceModel.find(query)
  },

  /**
   * Bulk mark — one `bulkWrite` round trip regardless of roster size, each
   * op an atomic upsert keyed on the `{sessionId, studentId}` unique index
   * (task's own explicit instruction: never one HTTP/DB round trip per
   * student).
   */
  async bulkUpsert(records: UpsertAttendanceInput[]): Promise<void> {
    if (records.length === 0) return
    await AttendanceModel.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: {
            sessionId: new Types.ObjectId(record.sessionId),
            studentId: new Types.ObjectId(record.studentId),
          },
          update: {
            $set: {
              batchId: new Types.ObjectId(record.batchId),
              courseId: new Types.ObjectId(record.courseId),
              enrollmentId: new Types.ObjectId(record.enrollmentId),
              status: record.status,
              notes: record.notes ?? null,
              source: record.source,
            },
            $setOnInsert: {
              sessionId: new Types.ObjectId(record.sessionId),
              studentId: new Types.ObjectId(record.studentId),
            },
          },
          upsert: true,
        },
      })),
    )
  },

  listForExport(filter: ListAttendanceFilter, maxRows: number): Promise<AttendanceDocument[]> {
    const query: Record<string, unknown> = {}
    if (filter.batchId) query.batchId = filter.batchId
    if (filter.courseId) query.courseId = filter.courseId
    if (filter.studentId) query.studentId = filter.studentId
    if (filter.sessionId) query.sessionId = filter.sessionId
    return AttendanceModel.find(query).sort({ createdAt: -1 }).limit(maxRows)
  },
}
