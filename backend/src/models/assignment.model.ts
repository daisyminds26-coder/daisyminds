import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import {
  assignmentAttachmentSchema,
  type IAssignmentAttachment,
} from './shared/assignment-attachment.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const ASSIGNMENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED',
] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const ASSIGNMENT_SUBMISSION_TYPES = ['TEXT', 'FILE', 'LINK', 'MIXED'] as const
export type AssignmentSubmissionType = (typeof ASSIGNMENT_SUBMISSION_TYPES)[number]

export type { IAssignmentAttachment }

/**
 * A graded task issued to one or more batches of one course — Phase 13
 * replaces the Phase 1 scaffold entirely (zero real consumers verified
 * before touching it, same precedent Phase 7/11B/12 established). Never
 * stores actual student submissions — those live in their own
 * `assignment_submissions` collection (below), since a submission has its
 * own independent per-student/per-attempt lifecycle.
 */
export interface IAssignment extends AuditFields {
  assignmentCode: string
  courseId: Types.ObjectId
  batchIds: Types.ObjectId[]

  title: string
  shortDescription: string | null
  instructions: string

  submissionType: AssignmentSubmissionType
  allowedFileTypes: string[]
  maxFiles: number
  maxFileSizeBytes: number

  maxMarks: number
  passingMarks: number | null

  dueDateTime: Date
  timezone: string

  allowLateSubmission: boolean
  lateUntil: Date | null

  allowResubmission: boolean
  maxAttempts: number | null

  status: AssignmentStatus
  publishedAt: Date | null
  closedAt: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null

  attachments: IAssignmentAttachment[]
}

export type AssignmentDocument = HydratedDocument<IAssignment>

const assignmentSchema = new Schema<IAssignment>({
  assignmentCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchIds: { type: [Schema.Types.ObjectId], ref: 'Batch', default: [] },

  title: { type: String, required: true, trim: true, maxlength: 200 },
  shortDescription: { type: String, default: null, trim: true, maxlength: 300 },
  instructions: { type: String, default: '', trim: true, maxlength: 10_000 },

  submissionType: { type: String, enum: ASSIGNMENT_SUBMISSION_TYPES, required: true },
  allowedFileTypes: { type: [String], default: [] },
  maxFiles: { type: Number, default: 1, min: 1, max: 10 },
  maxFileSizeBytes: { type: Number, default: 25 * 1024 * 1024, min: 1 },

  maxMarks: { type: Number, required: true, min: 1 },
  passingMarks: { type: Number, default: null, min: 0 },

  dueDateTime: { type: Date, required: true },
  timezone: { type: String, required: true, trim: true },

  allowLateSubmission: { type: Boolean, default: false },
  lateUntil: { type: Date, default: null },

  allowResubmission: { type: Boolean, default: false },
  maxAttempts: { type: Number, default: null, min: 1 },

  status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'DRAFT' },
  publishedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null, trim: true, maxlength: 500 },

  attachments: { type: [assignmentAttachmentSchema], default: [] },

  ...auditFieldsDefinition,
})

applyAuditPlugin(assignmentSchema)

assignmentSchema.index(
  { assignmentCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
assignmentSchema.index({ courseId: 1, status: 1 })
assignmentSchema.index({ batchIds: 1, status: 1 })
assignmentSchema.index({ dueDateTime: 1 })
assignmentSchema.index({ status: 1, dueDateTime: 1 })

export const AssignmentModel = model<IAssignment>('Assignment', assignmentSchema, 'assignments')
