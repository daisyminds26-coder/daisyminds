import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

/**
 * One selectable option for a SINGLE_CHOICE/MULTIPLE_CHOICE question.
 * Keeps its own Mongo `_id` (referenced as `optionId` everywhere a student's
 * answer or a snapshot needs to address one specific option) — same
 * `_id`-bearing-embed precedent as `assignment-attachment.schema.ts`.
 * `isCorrect` is stored here because the question bank is the authoring
 * source of truth, but it must never reach a student-facing DTO — every
 * mapper in `question-dto.ts`/`assessment-attempt-dto.ts` strips it
 * explicitly before the option ever leaves the service layer for a student.
 */
export interface IQuestionOption {
  _id: Types.ObjectId
  text: string
  isCorrect: boolean
}

export const questionOptionSchema = new Schema<IQuestionOption>({
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  isCorrect: { type: Boolean, required: true, default: false },
})
