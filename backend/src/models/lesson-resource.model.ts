import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/** Executable/installer formats are never allowed — see SECURITY.md's resource upload allowlist. */
export const LESSON_RESOURCE_TYPES = [
  'PDF',
  'DOCUMENT',
  'SLIDES',
  'ARCHIVE',
  'IMAGE',
  'OTHER',
] as const
export type LessonResourceType = (typeof LESSON_RESOURCE_TYPES)[number]

/**
 * Downloadable materials attached to a lesson (slides, code samples, PDFs) —
 * kept as its own collection rather than an embedded array on `lessons`
 * because a lesson has exactly one primary content item (its video/text/
 * document/link) but zero-to-many attachments with their own independent
 * add/reorder/remove lifecycle; embedding an unbounded array would also risk
 * the 16MB document limit on lessons with many resources (DATABASE.md).
 *
 * Phase 9C replaces the Phase 1 scaffold's `resourceUrl`/`fileType`/
 * `fileSizeBytes`/`order` fields (never read or written by any service
 * before this phase — verified by repo-wide search) with the actual
 * Cloudinary-asset-backed shape this phase's upload/verification flow
 * produces — no raw/permanent URL is ever stored (SECURITY.md).
 */
export interface ILessonResource extends AuditFields {
  lessonId: Types.ObjectId
  /** Denormalized from `lessonId.courseId` — same rationale as `lessons.courseId` (ARCHITECTURE.md §20). */
  courseId: Types.ObjectId
  title: string
  description: string | null
  resourceType: LessonResourceType
  provider: 'cloudinary'
  publicId: string
  assetId: string
  filename: string
  format: string
  mimeType: string
  bytes: number
  sortOrder: number
  isDownloadable: boolean
}

export type LessonResourceDocument = HydratedDocument<ILessonResource>

const lessonResourceSchema = new Schema<ILessonResource>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 1000 },
  resourceType: { type: String, enum: LESSON_RESOURCE_TYPES, required: true },
  provider: { type: String, enum: ['cloudinary'], required: true },
  publicId: { type: String, required: true },
  assetId: { type: String, required: true },
  filename: { type: String, required: true, trim: true, maxlength: 255 },
  format: { type: String, required: true, trim: true, maxlength: 20 },
  mimeType: { type: String, required: true, trim: true, maxlength: 150 },
  bytes: { type: Number, required: true, min: 0 },
  sortOrder: { type: Number, default: 0, min: 0 },
  isDownloadable: { type: Boolean, default: true },
  ...auditFieldsDefinition,
})

applyAuditPlugin(lessonResourceSchema)

lessonResourceSchema.index({ lessonId: 1, sortOrder: 1 })
lessonResourceSchema.index({ courseId: 1, lessonId: 1 })
lessonResourceSchema.index({ lessonId: 1, isDeleted: 1 })

export const LessonResourceModel = model<ILessonResource>(
  'LessonResource',
  lessonResourceSchema,
  'lesson_resources',
)
