import { z } from 'zod'

import { MAX_QUESTIONS_PER_ASSESSMENT } from '../models/assessment.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

/** Nested admin/trainer-by-assessment shape — `:id` is the assessment, `:attemptId` must genuinely belong to it (cross-checked server-side, 404 not 403, same pattern `assignment-submission.validator.ts#submissionIdParamSchema` established). */
export const assessmentAttemptParamSchema = z
  .object({ id: objectIdSchema, attemptId: objectIdSchema })
  .strict()
export type AssessmentAttemptParam = z.infer<typeof assessmentAttemptParamSchema>

/** Flat trainer-namespace shape (task's own suggested endpoint: `/trainer/assessment-attempts/:attemptId`) — ownership is verified by loading the attempt's own `assessmentId`, not by URL nesting. */
export const attemptIdParamSchema = z.object({ attemptId: objectIdSchema }).strict()
export type AttemptIdParam = z.infer<typeof attemptIdParamSchema>

export const listAttemptsQuerySchema = z
  .object({
    status: z.enum(['IN_PROGRESS', 'PENDING_MANUAL_GRADING', 'GRADED', 'INVALIDATED']).optional(),
    passStatus: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']).optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListAttemptsQuery = z.infer<typeof listAttemptsQuerySchema>

const gradeEntrySchema = z.object({
  questionId: objectIdSchema,
  marksAwarded: z.coerce.number().min(0),
  feedback: z.string().trim().max(2000).optional(),
})

export const gradeAttemptSchema = z
  .object({ grades: z.array(gradeEntrySchema).min(1).max(MAX_QUESTIONS_PER_ASSESSMENT) })
  .strict()
export type GradeAttemptInput = z.infer<typeof gradeAttemptSchema>

export const exportAssessmentResultsQuerySchema = z
  .object({
    assessmentId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    batchId: objectIdSchema.optional(),
  })
  .strict()
export type ExportAssessmentResultsQuery = z.infer<typeof exportAssessmentResultsQuerySchema>
