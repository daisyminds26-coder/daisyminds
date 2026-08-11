import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { APPROVAL_STATUSES, type ApprovalStatus } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

export const LESSON_TYPES = [
  'VIDEO',
  'TEXT',
  'DOCUMENT',
  'LIVE_CLASS',
  'QUIZ',
  'ASSIGNMENT',
  'EXTERNAL_LINK',
] as const
export type LessonType = (typeof LESSON_TYPES)[number]

/**
 * Server-computed only — never client-settable. `NOT_CONFIGURED` is reserved
 * for `LIVE_CLASS`/`QUIZ`/`ASSIGNMENT` lesson types, which have no content
 * model yet (deferred to their own future phases); every other lesson type
 * resolves to one of the remaining five values based on its content field.
 */
export const CONTENT_STATUSES = [
  'EMPTY',
  'INCOMPLETE',
  'READY',
  'PROCESSING',
  'ERROR',
  'NOT_CONFIGURED',
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const MEDIA_ASSET_STATUSES = ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'] as const
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number]

/** Populated only after independent Cloudinary verification — never trusted from client-supplied values. */
export interface IVideoAsset {
  provider: 'cloudinary'
  publicId: string
  assetId: string
  resourceType: 'video'
  format: string
  durationSeconds: number | null
  width: number | null
  height: number | null
  bytes: number
  version: number
  status: MediaAssetStatus
  uploadedAt: Date
}

/** Populated only after independent Cloudinary verification — never trusted from client-supplied values. */
export interface IDocumentAsset {
  provider: 'cloudinary'
  publicId: string
  assetId: string
  format: string
  bytes: number
  version: number
  originalFilename: string
  uploadedAt: Date
}

/** Backend-validated on every write — scheme, length, and normalization enforced server-side (SECURITY.md). */
export interface IExternalLink {
  url: string
  label: string | null
  description: string | null
  openInNewTab: boolean
}

/**
 * `courseId` is a deliberate denormalization of `courseModuleId.courseId` —
 * read-heavy access patterns like "all lessons in course X" and progress
 * calculations would otherwise require a join through course_modules for
 * every read. Kept in sync by the service layer at creation time (a lesson
 * never moves between courses, only between modules within the same course).
 *
 * Phase 9B extends the Phase 1 scaffold additively, with one deliberate
 * exception: the scaffold's `isPublished` boolean and `durationSeconds`
 * fields are replaced by `status` (the same shared `ApprovalStatus` enum
 * `courses`/`course_modules` use) and `estimatedDurationMinutes` — safe
 * because no service/route ever read or wrote either field before this
 * phase (ARCHITECTURE.md §20).
 *
 * Phase 9C replaces the Phase 1 scaffold's dormant `contentType`/`contentUrl`
 * fields (never read or written by any service before this phase — verified
 * by repo-wide search) with a `lessonType`-discriminated content structure:
 * exactly one of `textContent`/`videoAsset`/`documentAsset`/`externalLink` is
 * populated per lesson, matching its `lessonType`. `contentStatus` is always
 * computed server-side from the populated content field — never accepted
 * from the client (DATABASE.md §Lessons, ARCHITECTURE.md §21).
 */
export interface ILesson extends AuditFields {
  courseModuleId: Types.ObjectId
  courseId: Types.ObjectId
  title: string
  shortDescription: string
  order: number
  lessonType: LessonType
  status: ApprovalStatus
  estimatedDurationMinutes: number | null
  isPreview: boolean
  isMandatory: boolean
  /** Structure metadata only — no student unlock/progress enforcement this phase (ARCHITECTURE.md §20). */
  prerequisiteLessonIds: Types.ObjectId[]
  /** Server-computed only — see `CONTENT_STATUSES`. */
  contentStatus: ContentStatus
  /** Populated only when `lessonType === 'TEXT'`; server-sanitized HTML (SECURITY.md). */
  textContent: string | null
  /** Populated only when `lessonType === 'VIDEO'`. */
  videoAsset: IVideoAsset | null
  /** Populated only when `lessonType === 'DOCUMENT'`. */
  documentAsset: IDocumentAsset | null
  /** Populated only when `lessonType === 'EXTERNAL_LINK'`. */
  externalLink: IExternalLink | null
  /**
   * Tombstone: `true` only when this lesson was soft-deleted as a side
   * effect of its parent module being deleted (never set by a direct
   * lesson-level delete). Restoring the module restores only lessons with
   * this flag set, then clears it — an independently-deleted lesson from
   * before the module delete is never resurrected by a module restore
   * (ARCHITECTURE.md §20).
   */
  deletedWithModule: boolean
}

export type LessonDocument = HydratedDocument<ILesson>

const lessonSchema = new Schema<ILesson>({
  courseModuleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  shortDescription: { type: String, default: '', trim: true, maxlength: 500 },
  order: { type: Number, required: true, min: 0 },
  lessonType: { type: String, enum: LESSON_TYPES, required: true },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  estimatedDurationMinutes: { type: Number, default: null, min: 0 },
  isPreview: { type: Boolean, default: false },
  isMandatory: { type: Boolean, default: true },
  prerequisiteLessonIds: { type: [Schema.Types.ObjectId], ref: 'Lesson', default: [] },
  contentStatus: { type: String, enum: CONTENT_STATUSES, default: 'EMPTY' },
  textContent: { type: String, default: null },
  videoAsset: {
    type: {
      provider: { type: String, enum: ['cloudinary'], required: true },
      publicId: { type: String, required: true },
      assetId: { type: String, required: true },
      resourceType: { type: String, enum: ['video'], required: true },
      format: { type: String, required: true },
      durationSeconds: { type: Number, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      bytes: { type: Number, required: true },
      version: { type: Number, required: true },
      status: { type: String, enum: MEDIA_ASSET_STATUSES, required: true },
      uploadedAt: { type: Date, required: true },
    },
    _id: false,
    default: null,
  },
  documentAsset: {
    type: {
      provider: { type: String, enum: ['cloudinary'], required: true },
      publicId: { type: String, required: true },
      assetId: { type: String, required: true },
      format: { type: String, required: true },
      bytes: { type: Number, required: true },
      version: { type: Number, required: true },
      originalFilename: { type: String, required: true },
      uploadedAt: { type: Date, required: true },
    },
    _id: false,
    default: null,
  },
  externalLink: {
    type: {
      url: { type: String, required: true },
      label: { type: String, default: null },
      description: { type: String, default: null },
      openInNewTab: { type: Boolean, default: true },
    },
    _id: false,
    default: null,
  },
  deletedWithModule: { type: Boolean, default: false },
  ...auditFieldsDefinition,
})

applyAuditPlugin(lessonSchema)

lessonSchema.index({ courseModuleId: 1, order: 1 })
lessonSchema.index({ courseId: 1, courseModuleId: 1 })
lessonSchema.index({ courseId: 1, status: 1 })
lessonSchema.index({ courseId: 1, isDeleted: 1 })
lessonSchema.index({ courseId: 1, contentStatus: 1 })

export const LessonModel = model<ILesson>('Lesson', lessonSchema, 'lessons')
