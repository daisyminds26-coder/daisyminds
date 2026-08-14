import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import {
  assessmentAttemptQuestionSnapshotSchema,
  type IAssessmentAttemptQuestionSnapshot,
} from './shared/assessment-attempt-snapshot.schema'
import {
  assessmentAttemptAnswerSchema,
  type IAssessmentAttemptAnswer,
} from './shared/assessment-attempt-answer.schema'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Four states, not the task's own suggested six — `SUBMITTED`/`AUTO_SUBMITTED`
 * are never independently persisted resting states in this design: objective
 * scoring is always synchronous (a cheap in-memory reduction over an
 * already-loaded snapshot, never a background job), so the moment a student
 * submits — manually or via expiry — the attempt transitions directly to
 * whichever of `PENDING_MANUAL_GRADING`/`GRADED` actually applies. *How* the
 * submission happened (student action vs. server-detected expiry) is instead
 * captured by the orthogonal `submissionMethod` field. This is the same
 * resolution shape as `assignment_submissions`' own 4-vs-5-state ADR
 * (ARCHITECTURE.md §28) — a timing/provenance concept folded into a boolean-
 * like field instead of inflating the lifecycle enum.
 */
export const ASSESSMENT_ATTEMPT_STATUSES = [
  'IN_PROGRESS',
  'PENDING_MANUAL_GRADING',
  'GRADED',
  'INVALIDATED',
] as const
export type AssessmentAttemptStatus = (typeof ASSESSMENT_ATTEMPT_STATUSES)[number]

export const SUBMISSION_METHODS = ['MANUAL', 'AUTO_EXPIRY'] as const
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number]

export const PASS_STATUSES = ['PASS', 'FAIL', 'NOT_APPLICABLE'] as const
export type PassStatus = (typeof PASS_STATUSES)[number]

export type { IAssessmentAttemptQuestionSnapshot, IAssessmentAttemptAnswer }

/**
 * One document per attempt (never per student-per-assessment) — mirrors
 * `assignment_submissions`' own attempt-per-document design. `attemptNumber`
 * is assigned at *creation*, not at successful completion, so starting a
 * second attempt always consumes one unit of `assessment.maxAttempts`
 * immediately, regardless of what the student does with it afterward
 * (documented choice — matches how real exam software counts attempts).
 *
 * `INVALIDATED` is schema-forward-compatible only this phase — reserved for
 * a future admin action (e.g. a technical-failure void), no write path
 * exists yet, same "reserved enum value, no fabricated UI for it"
 * discipline `live_classes.provider`'s unused values already established.
 */
export interface IAssessmentAttempt extends AuditFields {
  attemptCode: string
  assessmentId: Types.ObjectId
  studentId: Types.ObjectId
  enrollmentId: Types.ObjectId
  courseId: Types.ObjectId
  batchId: Types.ObjectId

  attemptNumber: number
  status: AssessmentAttemptStatus
  submissionMethod: SubmissionMethod | null

  startedAt: Date
  expiresAt: Date
  submittedAt: Date | null
  gradedAt: Date | null

  questionSnapshot: IAssessmentAttemptQuestionSnapshot[]
  answers: IAssessmentAttemptAnswer[]

  objectiveMarks: number | null
  manualMarks: number | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  gradedBy: Types.ObjectId | null
  /** First moment this attempt's result became visible to the student — either grading-completion time (if `assessment.showResultImmediately`) or the assessment's own results-publish action, whichever happens first. Purely informational (`assessment-scoring.util.ts#isAttemptResultVisible` is the actual, always-recomputed gate — this timestamp is never itself checked as authorization). */
  resultVisibleAt: Date | null

  /** Focus-loss (tab/window blur) count during the attempt — an audit signal only, never labeled or treated as proof of cheating (task's own explicit instruction: no fake anti-cheating claims). */
  focusLossCount: number
}

export type AssessmentAttemptDocument = HydratedDocument<IAssessmentAttempt>

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>({
  attemptCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },

  attemptNumber: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ASSESSMENT_ATTEMPT_STATUSES, default: 'IN_PROGRESS' },
  submissionMethod: { type: String, enum: SUBMISSION_METHODS, default: null },

  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  gradedAt: { type: Date, default: null },

  questionSnapshot: { type: [assessmentAttemptQuestionSnapshotSchema], default: [] },
  answers: { type: [assessmentAttemptAnswerSchema], default: [] },

  objectiveMarks: { type: Number, default: null },
  manualMarks: { type: Number, default: null },
  totalMarksAwarded: { type: Number, default: null },
  percentage: { type: Number, default: null },
  passStatus: { type: String, enum: PASS_STATUSES, default: null },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  resultVisibleAt: { type: Date, default: null },

  focusLossCount: { type: Number, default: 0, min: 0 },

  ...auditFieldsDefinition,
})

applyAuditPlugin(assessmentAttemptSchema)

assessmentAttemptSchema.index(
  { attemptCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
assessmentAttemptSchema.index({ assessmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true })
/** DB-level defense against the duplicate-start race (task's own explicit requirement) — at most one `IN_PROGRESS` attempt per (assessment, student) can ever exist, enforced by MongoDB's own unique-index write serialization, not just an application-level check-then-create. */
assessmentAttemptSchema.index(
  { assessmentId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'IN_PROGRESS', isDeleted: false } },
)
assessmentAttemptSchema.index({ assessmentId: 1, status: 1 })
assessmentAttemptSchema.index({ studentId: 1, assessmentId: 1 })
assessmentAttemptSchema.index({ batchId: 1, assessmentId: 1 })
assessmentAttemptSchema.index({ status: 1, expiresAt: 1 })

export const AssessmentAttemptModel = model<IAssessmentAttempt>(
  'AssessmentAttempt',
  assessmentAttemptSchema,
  'assessment_attempts',
)
