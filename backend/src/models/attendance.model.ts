import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

/**
 * One record per student per session date. No separate `markedBy` field —
 * the audit plugin's `createdBy` already captures who marked it, and
 * `updatedBy` captures who last corrected it; a duplicate field would only
 * invite drift between the two.
 */
export interface IAttendance extends AuditFields {
  batchId: Types.ObjectId
  liveClassId: Types.ObjectId | null
  sessionDate: Date
  studentId: Types.ObjectId
  status: AttendanceStatus
}

export type AttendanceDocument = HydratedDocument<IAttendance>

const attendanceSchema = new Schema<IAttendance>({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  liveClassId: { type: Schema.Types.ObjectId, ref: 'LiveClass', default: null },
  sessionDate: { type: Date, required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  ...auditFieldsDefinition,
})

applyAuditPlugin(attendanceSchema)

attendanceSchema.index({ batchId: 1, sessionDate: 1, studentId: 1 }, { unique: true })
attendanceSchema.index({ studentId: 1, sessionDate: -1 })

export const AttendanceModel = model<IAttendance>('Attendance', attendanceSchema, 'attendance')
