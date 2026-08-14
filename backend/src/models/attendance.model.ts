import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_SOURCES = ['MANUAL', 'SYSTEM', 'IMPORT'] as const
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number]

/**
 * One record per student per live-class session (Phase 12) — evolves the
 * Phase 1 scaffold (zero real consumers, verified before touching it) from
 * a loose `{batchId, sessionDate}` shape into one tied to a real
 * `live_classes` session record. A record is only ever created when a
 * student is explicitly marked, or on finalization (task's own explicit
 * "do not pre-mark everyone ABSENT" rule) — an eligible student with no
 * row is a derived `UNMARKED` state, never persisted as such.
 *
 * No separate `markedBy`/`markedAt` fields — same precedent the original
 * scaffold's own doc comment set: the audit plugin's `createdBy`/
 * `updatedBy`/`createdAt`/`updatedAt` already capture who marked/last
 * corrected it, and a duplicate field would only invite drift.
 */
export interface IAttendance extends AuditFields {
  sessionId: Types.ObjectId
  batchId: Types.ObjectId
  courseId: Types.ObjectId
  studentId: Types.ObjectId
  enrollmentId: Types.ObjectId
  status: AttendanceStatus
  checkInAt: Date | null
  checkOutAt: Date | null
  minutesAttended: number | null
  source: AttendanceSource
  notes: string | null
}

export type AttendanceDocument = HydratedDocument<IAttendance>

const attendanceSchema = new Schema<IAttendance>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },
  minutesAttended: { type: Number, default: null, min: 0 },
  source: { type: String, enum: ATTENDANCE_SOURCES, default: 'MANUAL' },
  notes: { type: String, default: null, trim: true, maxlength: 500 },
  ...auditFieldsDefinition,
})

applyAuditPlugin(attendanceSchema)

attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true })
attendanceSchema.index({ studentId: 1, sessionId: 1 })
attendanceSchema.index({ batchId: 1, status: 1 })
attendanceSchema.index({ courseId: 1, status: 1 })

export const AttendanceModel = model<IAttendance>('Attendance', attendanceSchema, 'attendance')
