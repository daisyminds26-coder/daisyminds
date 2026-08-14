import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { questionOptionSchema, type IQuestionOption } from './shared/question-option.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const QUESTION_TYPES = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'FILL_IN_THE_BLANK',
  'NUMERIC',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]

export const QUESTION_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

export type { IQuestionOption }

/**
 * A single, reusable question in the shared question bank — never owned by
 * one quiz/exam directly (task's own explicit instruction: "questions should
 * be reusable"). `assessments.sections[].questionIds` is what actually links
 * a question into an assessment; deleting/archiving a question never cascades
 * into an assessment that already references it, since every attempt keeps
 * its own immutable snapshot (`assessment-attempt.model.ts`) independent of
 * this document's current state.
 *
 * Auto- vs manual-gradability is derived from `questionType` plus, for
 * `FILL_IN_THE_BLANK` specifically, whether `acceptedAnswers` was configured
 * (see `assessment-scoring.util.ts#requiresManualGrading`) — never a
 * separately stored boolean that could drift from the type/config that
 * actually determines it.
 */
export interface IQuestion extends AuditFields {
  questionCode: string
  courseId: Types.ObjectId
  moduleId: Types.ObjectId | null
  lessonId: Types.ObjectId | null

  questionType: QuestionType
  difficulty: QuestionDifficulty | null
  questionText: string
  explanation: string | null

  marks: number
  negativeMarks: number | null

  /** SINGLE_CHOICE / MULTIPLE_CHOICE only. */
  options: IQuestionOption[]
  /** TRUE_FALSE only — a dedicated field rather than two synthetic True/False options (task's own suggested alternative). */
  correctBoolean: boolean | null
  /** FILL_IN_THE_BLANK optional auto-grade mode — non-empty enables exact-match auto-scoring; empty means manual grading (the type's own default). Trimmed/lowercased comparison at scoring time. */
  acceptedAnswers: string[]
  /** NUMERIC only — exact-match auto-scoring, no tolerance/epsilon config this phase (documented simplification). */
  correctNumericAnswer: number | null

  tags: string[]
  status: QuestionStatus
}

export type QuestionDocument = HydratedDocument<IQuestion>

const questionSchema = new Schema<IQuestion>({
  questionCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', default: null },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },

  questionType: { type: String, enum: QUESTION_TYPES, required: true },
  difficulty: { type: String, enum: QUESTION_DIFFICULTIES, default: null },
  questionText: { type: String, required: true, trim: true, maxlength: 5000 },
  explanation: { type: String, default: null, trim: true, maxlength: 3000 },

  marks: { type: Number, required: true, min: 0.5 },
  negativeMarks: { type: Number, default: null, min: 0 },

  options: { type: [questionOptionSchema], default: [] },
  correctBoolean: { type: Boolean, default: null },
  acceptedAnswers: { type: [String], default: [] },
  correctNumericAnswer: { type: Number, default: null },

  tags: { type: [String], default: [] },
  status: { type: String, enum: QUESTION_STATUSES, default: 'DRAFT' },

  ...auditFieldsDefinition,
})

applyAuditPlugin(questionSchema)

questionSchema.index(
  { questionCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
questionSchema.index({ courseId: 1, status: 1 })
questionSchema.index({ questionType: 1, status: 1 })
questionSchema.index({ difficulty: 1, status: 1 })
questionSchema.index({ tags: 1 })

export const QuestionModel = model<IQuestion>('Question', questionSchema, 'questions')
