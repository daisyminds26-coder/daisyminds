import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const LESSON_PROGRESS_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number]

export const PROGRESS_COMPLETION_SOURCES = ['MANUAL', 'VIDEO_THRESHOLD', 'SYSTEM'] as const
export type ProgressCompletionSource = (typeof PROGRESS_COMPLETION_SOURCES)[number]

/**
 * One document per student per lesson — the source of truth for course
 * completion percentage (Phase 11B). Evolves the Phase 1 scaffold (zero
 * real consumers, verified by repo-wide search before touching it — same
 * "safe to redesign" precedent Phase 7 set for `enrollments`), not a
 * redundant new collection.
 *
 * **Uniqueness is `{studentId, lessonId}`, deliberately *not*
 * `{studentId, enrollmentId, lessonId}`.** A lesson belongs to a *course*,
 * not a batch — if a student is transferred to a different batch of the
 * same course (§23's same-course transfer), or drops and is later
 * re-enrolled in the same course, their prior lesson progress should
 * survive that change, not silently orphan under a stale `enrollmentId`
 * and force the student to re-complete lessons they already finished.
 * `enrollmentId` is still stored (denormalized, updated on every write to
 * point at whichever enrollment was active at the time) purely for
 * admin/reporting traceability — it is never part of the identity key.
 *
 * `videoDurationSeconds` is deliberately *not* stored here — the
 * authoritative duration already lives on `lessons.videoAsset.durationSeconds`
 * (Cloudinary-verified at upload time, ARCHITECTURE.md §21). Persisting a
 * second copy here would just be a value that can drift from the source of
 * truth for no benefit; the 90%-watched completion check always reads the
 * lesson's own verified duration, never a client-supplied or denormalized one.
 */
export interface ILessonProgress extends AuditFields {
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  lessonId: Types.ObjectId
  enrollmentId: Types.ObjectId
  status: LessonProgressStatus
  videoPositionSeconds: number
  startedAt: Date | null
  lastAccessedAt: Date | null
  completedAt: Date | null
  completionSource: ProgressCompletionSource | null
}

export type LessonProgressDocument = HydratedDocument<ILessonProgress>

const lessonProgressSchema = new Schema<ILessonProgress>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  status: { type: String, enum: LESSON_PROGRESS_STATUSES, default: 'NOT_STARTED' },
  videoPositionSeconds: { type: Number, default: 0, min: 0 },
  startedAt: { type: Date, default: null },
  lastAccessedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  completionSource: { type: String, enum: PROGRESS_COMPLETION_SOURCES, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(lessonProgressSchema)

lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true })
/** The course-progress aggregation's own access path — "every progress row this student has for course X," one query. */
lessonProgressSchema.index({ studentId: 1, courseId: 1 })
lessonProgressSchema.index({ enrollmentId: 1 })

export const LessonProgressModel = model<ILessonProgress>(
  'LessonProgress',
  lessonProgressSchema,
  'lesson_progress',
)
