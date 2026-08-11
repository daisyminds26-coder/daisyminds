import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { attachmentSchema, type IAttachment } from './shared/attachment.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const SUBMISSION_STATUSES = ['SUBMITTED', 'LATE', 'GRADED'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/**
 * One document per student per assignment — a resubmission (before grading)
 * updates this same document rather than creating a new one, per the unique
 * index below. `gradedBy`/`gradedAt` are kept explicit (not just relying on
 * the audit plugin's `updatedBy`) because grading is a distinct, significant
 * lifecycle event that a later unrelated update should not be able to
 * obscure.
 */
export interface IAssignmentSubmission extends AuditFields {
  assignmentId: Types.ObjectId
  studentId: Types.ObjectId
  submittedAt: Date
  attachments: IAttachment[]
  score: number | null
  feedback: string | null
  status: SubmissionStatus
  gradedBy: Types.ObjectId | null
  gradedAt: Date | null
}

export type AssignmentSubmissionDocument = HydratedDocument<IAssignmentSubmission>

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  submittedAt: { type: Date, default: Date.now },
  attachments: { type: [attachmentSchema], default: [] },
  score: { type: Number, default: null, min: 0 },
  feedback: { type: String, default: null, trim: true, maxlength: 3000 },
  status: { type: String, enum: SUBMISSION_STATUSES, default: 'SUBMITTED' },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  gradedAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(assignmentSubmissionSchema)

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true })
assignmentSubmissionSchema.index({ studentId: 1, status: 1 })

export const AssignmentSubmissionModel = model<IAssignmentSubmission>(
  'AssignmentSubmission',
  assignmentSubmissionSchema,
  'assignment_submissions',
)
