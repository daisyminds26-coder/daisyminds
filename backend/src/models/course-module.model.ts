import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { APPROVAL_STATUSES, type ApprovalStatus } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * A named grouping of lessons within a course's curriculum tree
 * (Course -> course_modules -> lessons). `order` is not uniqueness-enforced
 * at the schema level — a bulk reorder operation would otherwise need a
 * transaction just to avoid a transient duplicate-key error; the service
 * layer owns reorder correctness (Phase 9B — `curriculum-order.util.ts`).
 *
 * Phase 9B extends the Phase 1 scaffold additively: `status` (the same
 * shared `ApprovalStatus` enum `courses` uses) and `estimatedDurationMinutes`
 * are new. A module's `status` is independent of its parent course's own
 * `status` — a `PUBLISHED` course may still contain `DRAFT` modules being
 * staged for a future update (ARCHITECTURE.md §20).
 */
export interface ICourseModule extends AuditFields {
  courseId: Types.ObjectId
  title: string
  description: string
  order: number
  status: ApprovalStatus
  estimatedDurationMinutes: number | null
}

export type CourseModuleDocument = HydratedDocument<ICourseModule>

const courseModuleSchema = new Schema<ICourseModule>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  order: { type: Number, required: true, min: 0 },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  estimatedDurationMinutes: { type: Number, default: null, min: 0 },
  ...auditFieldsDefinition,
})

applyAuditPlugin(courseModuleSchema)

courseModuleSchema.index({ courseId: 1, order: 1 })
courseModuleSchema.index({ courseId: 1, status: 1 })
courseModuleSchema.index({ courseId: 1, isDeleted: 1 })

export const CourseModuleModel = model<ICourseModule>(
  'CourseModule',
  courseModuleSchema,
  'course_modules',
)
