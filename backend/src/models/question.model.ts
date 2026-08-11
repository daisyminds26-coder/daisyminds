import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const QUESTION_TYPES = ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]

export interface IQuestionOption {
  text: string
  isCorrect: boolean
}

/**
 * Standalone question bank — referenced by both `quizzes` and
 * `examinations` (`questionIds: ObjectId[]`), not embedded in either. This
 * is the one place in the schema where reuse across two parent collections
 * makes referencing the right call over embedding: the same question can
 * appear in many quizzes/exams, and editing it once must not require
 * updating N embedded copies.
 */
export interface IQuestion extends AuditFields {
  courseId: Types.ObjectId | null
  type: QuestionType
  text: string
  options: IQuestionOption[]
  correctAnswerText: string | null
  marks: number
  difficulty: QuestionDifficulty | null
  explanation: string | null
  tags: string[]
}

export type QuestionDocument = HydratedDocument<IQuestion>

const questionOptionSchema = new Schema<IQuestionOption>(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
)

const questionSchema = new Schema<IQuestion>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  type: { type: String, enum: QUESTION_TYPES, required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  options: { type: [questionOptionSchema], default: [] },
  correctAnswerText: { type: String, default: null, trim: true, maxlength: 2000 },
  marks: { type: Number, required: true, min: 0 },
  difficulty: { type: String, enum: QUESTION_DIFFICULTIES, default: null },
  explanation: { type: String, default: null, trim: true, maxlength: 2000 },
  tags: { type: [String], default: [] },
  ...auditFieldsDefinition,
})

applyAuditPlugin(questionSchema)

questionSchema.index({ courseId: 1 })
questionSchema.index({ type: 1 })
questionSchema.index({ tags: 1 })
questionSchema.index({ text: 'text' })

export const QuestionModel = model<IQuestion>('Question', questionSchema, 'questions')
