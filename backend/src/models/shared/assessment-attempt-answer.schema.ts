import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

/**
 * A student's answer to one snapshotted question — `{_id: false}`, keyed by
 * `questionId` (never addressed by its own subdocument id). Auto-save
 * (`PATCH .../answers`) upserts entries in this array by `questionId`;
 * `marksAwarded`/`isCorrect` are written only by the scoring engine
 * (auto-grading at submit time) or the manual-grading endpoint — never
 * accepted from the student's own auto-save payload (`assessment-attempt.
 * validator.ts`'s `saveAnswersSchema` never declares them).
 */
export interface IAssessmentAttemptAnswer {
  questionId: Types.ObjectId
  selectedOptionIds: Types.ObjectId[]
  booleanAnswer: boolean | null
  textAnswer: string | null
  numericAnswer: number | null
  answeredAt: Date | null
  flaggedForReview: boolean
  marksAwarded: number | null
  isCorrect: boolean | null
  manualFeedback: string | null
}

export const assessmentAttemptAnswerSchema = new Schema<IAssessmentAttemptAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionIds: { type: [Schema.Types.ObjectId], default: [] },
    booleanAnswer: { type: Boolean, default: null },
    textAnswer: { type: String, default: null, maxlength: 20_000 },
    numericAnswer: { type: Number, default: null },
    answeredAt: { type: Date, default: null },
    flaggedForReview: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: null },
    isCorrect: { type: Boolean, default: null },
    manualFeedback: { type: String, default: null, maxlength: 2000 },
  },
  { _id: false },
)
