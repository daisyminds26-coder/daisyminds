import { z } from 'zod'

import { MAX_QUESTIONS_PER_ASSESSMENT } from '../models/assessment.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const studentAssessmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type StudentAssessmentIdParam = z.infer<typeof studentAssessmentIdParamSchema>

export const studentAttemptIdParamSchema = z.object({ attemptId: objectIdSchema }).strict()
export type StudentAttemptIdParam = z.infer<typeof studentAttemptIdParamSchema>

/**
 * One entry per answered/updated question — never the client's own claim of
 * correctness or marks (mass-assignment protection, SECURITY.md §4's
 * established "schema never declares a server-computed field" discipline).
 * Every field is optional per entry; the service reads only the field(s)
 * relevant to that question's own snapshotted `questionType`, and rejects
 * (400) any `questionId` not present in the attempt's own snapshot.
 */
const answerEntrySchema = z.object({
  questionId: objectIdSchema,
  selectedOptionIds: z.array(objectIdSchema).max(10).optional(),
  booleanAnswer: z.boolean().optional(),
  textAnswer: z.string().max(20_000).optional(),
  numericAnswer: z.coerce.number().optional(),
  flaggedForReview: z.boolean().optional(),
})

export const saveAnswersSchema = z
  .object({ answers: z.array(answerEntrySchema).min(1).max(MAX_QUESTIONS_PER_ASSESSMENT) })
  .strict()
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>

export const recordFocusLossSchema = z.object({}).strict()
export type RecordFocusLossInput = z.infer<typeof recordFocusLossSchema>
