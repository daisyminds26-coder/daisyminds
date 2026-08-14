import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

import { questionOptionSchema, type IQuestionOption } from './question-option.schema'
import type { QuestionType } from '../question.model'

/**
 * A frozen, per-attempt copy of one question — taken once at attempt start
 * and never recomputed, so a later edit/archive of the source `Question`
 * document can never change how an already-in-progress or already-graded
 * attempt is displayed or scored (task's own explicit "snapshot" requirement).
 * Carries the full correct-answer data (`options[].isCorrect`,
 * `correctBoolean`, `acceptedAnswers`, `correctNumericAnswer`) — this is the
 * one place that data legitimately lives per-attempt; every DTO mapper that
 * ever serializes a snapshot for a student strips it explicitly
 * (`assessment-attempt-dto.ts`), never by omission alone.
 *
 * `{_id: false}`: addressed by its natural `questionId` key everywhere (a
 * student's answer references `questionId`, never a synthetic snapshot-row
 * id) — same "bare embed when a natural key already exists" precedent as
 * `shared/attachment.schema.ts`.
 */
export interface IAssessmentAttemptQuestionSnapshot {
  questionId: Types.ObjectId
  sectionId: Types.ObjectId
  order: number
  questionType: QuestionType
  questionText: string
  explanation: string | null
  marks: number
  negativeMarks: number | null
  requiresManualGrading: boolean
  options: IQuestionOption[]
  correctBoolean: boolean | null
  acceptedAnswers: string[]
  correctNumericAnswer: number | null
}

export const assessmentAttemptQuestionSnapshotSchema =
  new Schema<IAssessmentAttemptQuestionSnapshot>(
    {
      questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      sectionId: { type: Schema.Types.ObjectId, required: true },
      order: { type: Number, required: true, min: 0 },
      questionType: { type: String, required: true },
      questionText: { type: String, required: true },
      explanation: { type: String, default: null },
      marks: { type: Number, required: true, min: 0 },
      negativeMarks: { type: Number, default: null, min: 0 },
      requiresManualGrading: { type: Boolean, required: true },
      options: { type: [questionOptionSchema], default: [] },
      correctBoolean: { type: Boolean, default: null },
      acceptedAnswers: { type: [String], default: [] },
      correctNumericAnswer: { type: Number, default: null },
    },
    { _id: false },
  )
