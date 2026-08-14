import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

/**
 * One section of an assessment. A "flat," unsectioned quiz/exam is never a
 * separate code path — it is simply an assessment with exactly one section
 * (blank `title`), so the authoring UI, readiness check, and attempt-start
 * question-selection logic all have a single implementation regardless of
 * whether the admin thinks of it as "sectioned" or not.
 *
 * `randomQuestionCount`, when set, means the section's `questionIds` is a
 * *pool* — the server draws that many questions from it once, at attempt
 * start, and never recomputes the draw. When `null`, every id in
 * `questionIds` is used, in `shuffleQuestions`-dependent order.
 *
 * Readiness-check enforces that every question in a `randomQuestionCount`
 * pool carries identical `marks` (`assessment.service.ts#assertReadyToPublish`)
 * — otherwise `assessment.totalMarks` would vary per student depending on
 * which questions were drawn, which this engine deliberately does not
 * support (documented simplification, not an oversight).
 */
export interface IAssessmentSection {
  _id: Types.ObjectId
  title: string
  instructions: string | null
  order: number
  questionIds: Types.ObjectId[]
  randomQuestionCount: number | null
}

export const assessmentSectionSchema = new Schema<IAssessmentSection>({
  title: { type: String, default: '', trim: true, maxlength: 200 },
  instructions: { type: String, default: null, trim: true, maxlength: 2000 },
  order: { type: Number, required: true, min: 0 },
  questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
  randomQuestionCount: { type: Number, default: null, min: 1 },
})
