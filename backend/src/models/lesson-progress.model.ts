import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const LESSON_PROGRESS_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number]

/**
 * One document per student per lesson — the source of truth for course
 * completion percentage and the Progress Tracking module. High write volume
 * (updated on every video-progress heartbeat) but bounded per student
 * (one doc per lesson they've started), not per-event — DATABASE.md §2.3.
 */
export interface ILessonProgress extends AuditFields {
  studentId: Types.ObjectId
  lessonId: Types.ObjectId
  enrollmentId: Types.ObjectId
  status: LessonProgressStatus
  watchedSeconds: number
  lastWatchedAt: Date | null
  completedAt: Date | null
}

export type LessonProgressDocument = HydratedDocument<ILessonProgress>

const lessonProgressSchema = new Schema<ILessonProgress>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  status: { type: String, enum: LESSON_PROGRESS_STATUSES, default: 'NOT_STARTED' },
  watchedSeconds: { type: Number, default: 0, min: 0 },
  lastWatchedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(lessonProgressSchema)

lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true })
lessonProgressSchema.index({ enrollmentId: 1 })

export const LessonProgressModel = model<ILessonProgress>(
  'LessonProgress',
  lessonProgressSchema,
  'lesson_progress',
)
