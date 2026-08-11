import { z } from 'zod'

import { LESSON_TYPES } from '@/features/courses/curriculum/types'

/** Number field stays a validated **string** end-to-end — never `z.coerce.*` (see `features/courses/schemas/course.schemas.ts`'s documented reason: coercion diverges a schema's input/output type and breaks `useForm<T>()`'s `Control<T>` inference). */
const numericString = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d*\.?\d*$/, 'Numbers only')
    .max(max)
    .optional()
    .or(z.literal(''))

export const moduleFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    estimatedDurationMinutes: numericString(6),
  })
  .strict()
/** `z.input`, not `z.infer` — see `course.schemas.ts` for why an RHF form's values type should always be the schema's pre-parse input shape, not its post-default output shape. */
export type ModuleFormValues = z.input<typeof moduleFormSchema>

export const lessonFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortDescription: z.string().trim().max(500).optional().or(z.literal('')),
    lessonType: z.enum(LESSON_TYPES),
    estimatedDurationMinutes: numericString(6),
    isPreview: z.boolean().default(false),
    isMandatory: z.boolean().default(true),
    prerequisiteLessonIds: z.array(z.string()).default([]),
  })
  .strict()
export type LessonFormValues = z.input<typeof lessonFormSchema>
