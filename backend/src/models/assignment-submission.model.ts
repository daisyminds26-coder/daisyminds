import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import {
  assignmentAttachmentSchema,
  type IAssignmentAttachment,
} from './shared/assignment-attachment.schema'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Deliberately 4 states, not 5 — the spec's own two candidate lists
 * (`DRAFT/SUBMITTED/LATE/RETURNED/GRADED` vs. later
 * `UNSUBMITTED/SUBMITTED/GRADING/GRADED/RETURNED`) both fold a *timing*
 * concept ("late") or a purely-derived concept ("unsubmitted"/"grading" —
 * there's no separate grading-in-progress state to persist) into the
 * lifecycle enum. "Late" is orthogonal to lifecycle (a submission can be
 * `SUBMITTED`-and-late or `GRADED`-and-was-late) so it's its own boolean
 * (`submittedLate`, set once at submit time), not a status value — the
 * spec's own "Grade Status" section explicitly warns against duplicating
 * values between `status` and something else ("keep the model simple").
 * `DRAFT` never counts as a real attempt (see `attemptNumber` below).
 */
export const ASSIGNMENT_SUBMISSION_STATUSES = ['DRAFT', 'SUBMITTED', 'RETURNED', 'GRADED'] as const
export type AssignmentSubmissionStatus = (typeof ASSIGNMENT_SUBMISSION_STATUSES)[number]

/**
 * One document per **attempt** (not one per student-per-assignment, unlike
 * the Phase 1 scaffold this replaces) — resubmission after grading creates
 * a new document with an incremented `attemptNumber` rather than
 * overwriting the graded one, so grading/feedback history is never erased
 * (task's own explicit instruction). Zero real consumers of the old
 * single-document-per-student shape were found before this rewrite.
 */
export interface IAssignmentSubmission extends AuditFields {
  submissionCode: string
  assignmentId: Types.ObjectId
  studentId: Types.ObjectId
  enrollmentId: Types.ObjectId
  courseId: Types.ObjectId
  batchId: Types.ObjectId

  attemptNumber: number
  status: AssignmentSubmissionStatus

  textResponse: string | null
  linkResponse: string | null
  files: IAssignmentAttachment[]

  submittedAt: Date | null
  submittedLate: boolean

  marksAwarded: number | null
  feedback: string | null
  gradedBy: Types.ObjectId | null
  gradedAt: Date | null

  returnedAt: Date | null
  returnReason: string | null
}

export type AssignmentSubmissionDocument = HydratedDocument<IAssignmentSubmission>

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  submissionCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },

  attemptNumber: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ASSIGNMENT_SUBMISSION_STATUSES, default: 'DRAFT' },

  textResponse: { type: String, default: null, trim: true, maxlength: 20_000 },
  linkResponse: { type: String, default: null, trim: true, maxlength: 1000 },
  files: { type: [assignmentAttachmentSchema], default: [] },

  submittedAt: { type: Date, default: null },
  submittedLate: { type: Boolean, default: false },

  marksAwarded: { type: Number, default: null, min: 0 },
  /** Feedback shown to the student — never an internal-only trainer note (task's own explicit instruction; no `internalNotes` field exists, since no consumer needs it yet). */
  feedback: { type: String, default: null, trim: true, maxlength: 3000 },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  gradedAt: { type: Date, default: null },

  returnedAt: { type: Date, default: null },
  returnReason: { type: String, default: null, trim: true, maxlength: 500 },

  ...auditFieldsDefinition,
})

applyAuditPlugin(assignmentSubmissionSchema)

assignmentSubmissionSchema.index(
  { submissionCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
assignmentSubmissionSchema.index(
  { assignmentId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true },
)
assignmentSubmissionSchema.index({ assignmentId: 1, status: 1 })
assignmentSubmissionSchema.index({ studentId: 1, assignmentId: 1 })
assignmentSubmissionSchema.index({ batchId: 1, assignmentId: 1 })
assignmentSubmissionSchema.index({ gradedBy: 1, status: 1 })

export const AssignmentSubmissionModel = model<IAssignmentSubmission>(
  'AssignmentSubmission',
  assignmentSubmissionSchema,
  'assignment_submissions',
)
