import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import {
  assessmentSectionSchema,
  type IAssessmentSection,
} from './shared/assessment-section.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const ASSESSMENT_TYPES = ['QUIZ', 'EXAM'] as const
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number]

/**
 * Six explicit states — deliberately **not** the task's own suggested
 * `OPEN` as a seventh stored status. The task's own "Best approach" section
 * resolves this exact ambiguity itself: "lifecycle remains explicit for
 * major states + availability computed from openAt/closeAt." Storing OPEN
 * would make it a second, independently-driftable source of truth for
 * something that's already fully determined by `status === 'PUBLISHED'`
 * plus the current time against `openAt`/`closeAt` — so "is this assessment
 * currently accepting attempts" is a pure function
 * (`assessment-lifecycle.util.ts#isAssessmentAcceptingAttempts`), never a
 * transition anyone calls. Mirrors how `assignment_submissions` resolved an
 * identical spec self-contradiction by making "late" a boolean instead of a
 * status value.
 */
export const ASSESSMENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
  'RESULT_PUBLISHED',
  'ARCHIVED',
  'CANCELLED',
] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

export type { IAssessmentSection }

/** Hard cap on total questions across all sections — keeps an attempt's embedded snapshot well under MongoDB's 16MB document limit even at "hundreds of questions" scale (task's own performance target). */
export const MAX_QUESTIONS_PER_ASSESSMENT = 300

/**
 * One unified engine for both quizzes and exams — `assessmentType`
 * discriminates *default configuration only* (ARCHITECTURE.md-style ADR:
 * see §29), never a fork in the service/model layer. A quiz and an exam are
 * the same document shape; only the values differ (e.g. a quiz typically
 * has `maxAttempts: 3`, an exam `maxAttempts: 1`).
 */
export interface IAssessment extends AuditFields {
  assessmentCode: string
  assessmentType: AssessmentType
  courseId: Types.ObjectId
  batchIds: Types.ObjectId[]

  title: string
  description: string | null
  instructions: string | null

  status: AssessmentStatus
  timezone: string
  openAt: Date | null
  closeAt: Date | null
  durationMinutes: number

  maxAttempts: number
  passingPercentage: number | null
  /** Server-computed from `sections[].questionIds`/`randomQuestionCount` marks — never client-writable directly, recomputed on every section/question write (`assessment.service.ts#recomputeTotalMarks`). */
  totalMarks: number

  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResultImmediately: boolean
  showCorrectAnswersAfterResult: boolean
  allowReviewAfterSubmit: boolean
  negativeMarkingEnabled: boolean

  sections: IAssessmentSection[]

  publishedAt: Date | null
  closedAt: Date | null
  resultsPublishedAt: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null
}

export type AssessmentDocument = HydratedDocument<IAssessment>

const assessmentSchema = new Schema<IAssessment>({
  assessmentCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  assessmentType: { type: String, enum: ASSESSMENT_TYPES, required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchIds: { type: [Schema.Types.ObjectId], ref: 'Batch', default: [] },

  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 2000 },
  instructions: { type: String, default: null, trim: true, maxlength: 10_000 },

  status: { type: String, enum: ASSESSMENT_STATUSES, default: 'DRAFT' },
  timezone: { type: String, required: true, trim: true },
  openAt: { type: Date, default: null },
  closeAt: { type: Date, default: null },
  durationMinutes: { type: Number, required: true, min: 1, max: 600 },

  maxAttempts: { type: Number, default: 1, min: 1, max: 20 },
  passingPercentage: { type: Number, default: null, min: 0, max: 100 },
  totalMarks: { type: Number, default: 0, min: 0 },

  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showResultImmediately: { type: Boolean, default: false },
  showCorrectAnswersAfterResult: { type: Boolean, default: false },
  allowReviewAfterSubmit: { type: Boolean, default: true },
  negativeMarkingEnabled: { type: Boolean, default: false },

  sections: { type: [assessmentSectionSchema], default: [] },

  publishedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  resultsPublishedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null, trim: true, maxlength: 500 },

  ...auditFieldsDefinition,
})

applyAuditPlugin(assessmentSchema)

assessmentSchema.index(
  { assessmentCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
assessmentSchema.index({ courseId: 1, status: 1 })
assessmentSchema.index({ batchIds: 1, status: 1 })
assessmentSchema.index({ openAt: 1, closeAt: 1 })
assessmentSchema.index({ status: 1, openAt: 1 })

export const AssessmentModel = model<IAssessment>('Assessment', assessmentSchema, 'assessments')
