import { z } from 'zod'

import {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
  MAX_QUESTIONS_PER_ASSESSMENT,
} from '../models/assessment.model'
import { isValidTimeZone } from '../utils/timezone'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimeZone, { message: 'Enter a valid IANA timezone (e.g. Asia/Kolkata)' })

export const assessmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type AssessmentIdParam = z.infer<typeof assessmentIdParamSchema>

/**
 * Deliberately **no** `.default()` on any field here — shared by both the
 * create and update (`.partial()`) schemas. See `question.validator.ts`'s
 * identical comment for the empirically-verified reason (Zod substitutes a
 * `.default()` the instant a key is absent, regardless of `.partial()`).
 */
const baseAssessmentFields = {
  assessmentType: z.enum(ASSESSMENT_TYPES),
  batchIds: z.array(objectIdSchema).max(50).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  instructions: z.string().trim().max(10_000).optional(),
  timezone: timeZoneSchema,
  openAt: z.coerce.date().optional(),
  closeAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  maxAttempts: z.coerce.number().int().min(1).max(20).optional(),
  passingPercentage: z.coerce.number().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResultImmediately: z.boolean().optional(),
  showCorrectAnswersAfterResult: z.boolean().optional(),
  allowReviewAfterSubmit: z.boolean().optional(),
  negativeMarkingEnabled: z.boolean().optional(),
}

function checkTimingShape(value: { openAt?: Date; closeAt?: Date }, ctx: z.RefinementCtx): void {
  if (value.openAt && value.closeAt && value.closeAt <= value.openAt) {
    ctx.addIssue({ code: 'custom', path: ['closeAt'], message: 'closeAt must be after openAt' })
  }
}

export const createAssessmentSchema = z
  .object({
    courseId: objectIdSchema,
    ...baseAssessmentFields,
    batchIds: z.array(objectIdSchema).min(1).max(50),
    maxAttempts: z.coerce.number().int().min(1).max(20).default(1),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    showResultImmediately: z.boolean().default(false),
    showCorrectAnswersAfterResult: z.boolean().default(false),
    allowReviewAfterSubmit: z.boolean().default(true),
    negativeMarkingEnabled: z.boolean().default(false),
  })
  .strict()
  .superRefine(checkTimingShape)
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>

export const updateAssessmentSchema = z
  .object(baseAssessmentFields)
  .partial()
  .strict()
  .superRefine(checkTimingShape)
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>

export const cancelAssessmentSchema = z
  .object({ reason: z.string().trim().min(1, 'A cancellation reason is required').max(500) })
  .strict()
export type CancelAssessmentInput = z.infer<typeof cancelAssessmentSchema>

export const listAssessmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(openAt|createdAt):(asc|desc)$/)
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as ['openAt' | 'createdAt', 'asc' | 'desc']
        return { field, direction }
      }),
    courseId: objectIdSchema.optional(),
    batchId: objectIdSchema.optional(),
    assessmentType: z.enum(ASSESSMENT_TYPES).optional(),
    status: z.enum(ASSESSMENT_STATUSES).optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>

const sectionInputSchema = z.object({
  title: z.string().trim().max(200).default(''),
  instructions: z.string().trim().max(2000).optional(),
  order: z.coerce.number().int().min(0),
  questionIds: z.array(objectIdSchema).min(1).max(MAX_QUESTIONS_PER_ASSESSMENT),
  randomQuestionCount: z.coerce.number().int().positive().optional(),
})

export const replaceSectionsSchema = z
  .object({ sections: z.array(sectionInputSchema).min(1).max(20) })
  .strict()
  .superRefine((value, ctx) => {
    const total = value.sections.reduce((sum, section) => sum + section.questionIds.length, 0)
    if (total > MAX_QUESTIONS_PER_ASSESSMENT) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: `An assessment may reference at most ${String(MAX_QUESTIONS_PER_ASSESSMENT)} questions in total`,
      })
    }
    value.sections.forEach((section, index) => {
      if (section.randomQuestionCount && section.randomQuestionCount > section.questionIds.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', index, 'randomQuestionCount'],
          message: 'randomQuestionCount cannot exceed the number of questions in the pool',
        })
      }
    })
  })
export type ReplaceSectionsInput = z.infer<typeof replaceSectionsSchema>
