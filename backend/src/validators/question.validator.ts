import { z } from 'zod'

import { QUESTION_TYPES, QUESTION_DIFFICULTIES, QUESTION_STATUSES } from '../models/question.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const questionIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type QuestionIdParam = z.infer<typeof questionIdParamSchema>

const optionInputSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
})

/**
 * Deliberately **no** `.default()` on any field here — this object is
 * shared by both the create and update (`.partial()`) schemas below, and
 * Zod substitutes a field's default the instant its key is `undefined`
 * (including "absent from the request body entirely"), regardless of
 * `.partial()`/`.optional()` elsewhere. Verified empirically against this
 * repo's own Zod version: a bare `.partial()` schema with a `.default([])`
 * field silently injects `[]` for a PATCH that never mentions that field —
 * exactly the bug SECURITY.md §4 documents (and fixed) for
 * `updateBatchSchema`. Defaults are applied only on `createQuestionSchema`
 * below, via `.extend()`, so "omitted at creation" still means "start
 * empty" without resurrecting that bug for updates.
 */
const baseQuestionFields = {
  courseId: objectIdSchema,
  moduleId: objectIdSchema.optional(),
  lessonId: objectIdSchema.optional(),
  questionType: z.enum(QUESTION_TYPES),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
  questionText: z.string().trim().min(1).max(5000),
  explanation: z.string().trim().max(3000).optional(),
  marks: z.coerce.number().min(0.5).max(100),
  negativeMarks: z.coerce.number().min(0).max(100).optional(),
  options: z.array(optionInputSchema).max(10).optional(),
  correctBoolean: z.boolean().optional(),
  acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  correctNumericAnswer: z.coerce.number().optional(),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(20).optional(),
}

interface QuestionShapeInput {
  questionType?: (typeof QUESTION_TYPES)[number]
  options?: { text: string; isCorrect: boolean }[]
  correctBoolean?: boolean
  correctNumericAnswer?: number
}

/**
 * Every question-shape rule the spec's "Objective Question Options"/
 * "Subjective Questions"/"Question Types" sections require, enforced once,
 * server-side — never trusting the frontend authoring form to have gotten
 * it right. Shared by both create (where `questionType` is always present)
 * and update (`.partial()`, so a rule only fires when the relevant fields
 * are actually present in this particular request).
 */
function checkQuestionShape(value: QuestionShapeInput, ctx: z.RefinementCtx): void {
  const options = value.options ?? []

  if (value.questionType === 'SINGLE_CHOICE' || value.questionType === 'MULTIPLE_CHOICE') {
    if (options.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'At least 2 options are required',
      })
    }
    const correctCount = options.filter((option) => option.isCorrect).length
    if (correctCount === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'At least one option must be marked correct',
      })
    }
    if (value.questionType === 'SINGLE_CHOICE' && correctCount > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'SINGLE_CHOICE allows exactly one correct option',
      })
    }
  }

  if (value.questionType === 'TRUE_FALSE' && value.correctBoolean === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['correctBoolean'],
      message: 'correctBoolean is required for a TRUE_FALSE question',
    })
  }

  if (value.questionType === 'NUMERIC' && value.correctNumericAnswer === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['correctNumericAnswer'],
      message: 'correctNumericAnswer is required for a NUMERIC question',
    })
  }
}

export const createQuestionSchema = z
  .object(baseQuestionFields)
  .extend({
    options: z.array(optionInputSchema).max(10).default([]),
    acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    tags: z.array(z.string().trim().toLowerCase().max(40)).max(20).default([]),
  })
  .strict()
  .superRefine(checkQuestionShape)
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>

export const updateQuestionSchema = z
  .object(baseQuestionFields)
  .partial()
  .strict()
  .superRefine(checkQuestionShape)
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>

export const listQuestionsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(createdAt|questionText):(asc|desc)$/)
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [
          'createdAt' | 'questionText',
          'asc' | 'desc',
        ]
        return { field, direction }
      }),
    courseId: objectIdSchema.optional(),
    questionType: z.enum(QUESTION_TYPES).optional(),
    difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
    status: z.enum(QUESTION_STATUSES).optional(),
    tag: z.string().trim().max(40).optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>
