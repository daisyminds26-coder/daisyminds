import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

/**
 * Shared shape for a single answered question — identical for quiz_attempts
 * and examination_results, so it lives once here rather than being
 * duplicated across both schemas (CLAUDE.md — never duplicate business
 * logic/shape definitions).
 */
export interface IAttemptAnswer {
  questionId: Types.ObjectId
  selectedOptionIndexes: number[]
  answerText: string | null
  isCorrect: boolean | null
  marksAwarded: number | null
}

export const attemptAnswerSchema = new Schema<IAttemptAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionIndexes: { type: [Number], default: [] },
    answerText: { type: String, default: null, maxlength: 5000 },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: null, min: 0 },
  },
  { _id: false },
)
