import { z } from 'zod'

import { LESSON_TYPES } from '../models/lesson.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const courseIdParamSchema = z.object({ courseId: objectIdSchema }).strict()
export type CourseIdParam = z.infer<typeof courseIdParamSchema>

export const moduleIdParamSchema = z
  .object({ courseId: objectIdSchema, moduleId: objectIdSchema })
  .strict()
export type ModuleIdParam = z.infer<typeof moduleIdParamSchema>

export const lessonIdParamSchema = z
  .object({ courseId: objectIdSchema, moduleId: objectIdSchema, lessonId: objectIdSchema })
  .strict()
export type LessonIdParam = z.infer<typeof lessonIdParamSchema>

/** `:courseId/lessons/:lessonId/move` has no `:moduleId` segment — the target module is the whole point of the request body. */
export const courseLessonIdParamSchema = z
  .object({ courseId: objectIdSchema, lessonId: objectIdSchema })
  .strict()
export type CourseLessonIdParam = z.infer<typeof courseLessonIdParamSchema>

/**
 * Module fields only — position is never accepted here (a create always
 * appends to the end; an update must go through the dedicated reorder
 * endpoint, CODING-STANDARDS.md's "client cannot arbitrarily set position").
 */
export const createModuleSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional(),
    estimatedDurationMinutes: z.coerce.number().int().positive().max(100_000).optional(),
  })
  .strict()
export type CreateModuleInput = z.infer<typeof createModuleSchema>

export const updateModuleSchema = createModuleSchema.partial().strict()
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>

export const createLessonSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortDescription: z.string().trim().max(500).optional(),
    lessonType: z.enum(LESSON_TYPES),
    estimatedDurationMinutes: z.coerce.number().int().positive().max(100_000).optional(),
    isPreview: z.boolean().default(false),
    isMandatory: z.boolean().default(true),
    prerequisiteLessonIds: z.array(objectIdSchema).max(50).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.prerequisiteLessonIds).size !== value.prerequisiteLessonIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate prerequisite lesson ids',
        path: ['prerequisiteLessonIds'],
      })
    }
  })
export type CreateLessonInput = z.infer<typeof createLessonSchema>

/**
 * Deliberately **no** `.default()` on `isPreview`/`isMandatory`/
 * `prerequisiteLessonIds` here — this object only ever feeds
 * `updateLessonSchema` via `.partial()`. Same empirically-verified rule
 * `question.validator.ts`/`batch.validator.ts` document (SECURITY.md §4):
 * a defaulted field here would silently reset on any update that didn't
 * resend it (e.g. clearing a lesson's prerequisites on an unrelated title
 * edit). `createLessonSchema` above carries its own, separate defaults.
 */
const lessonBaseSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortDescription: z.string().trim().max(500).optional(),
    lessonType: z.enum(LESSON_TYPES),
    estimatedDurationMinutes: z.coerce.number().int().positive().max(100_000).optional(),
    isPreview: z.boolean().optional(),
    isMandatory: z.boolean().optional(),
    prerequisiteLessonIds: z.array(objectIdSchema).max(50).optional(),
  })
  .strict()

export const updateLessonSchema = lessonBaseSchema
  .partial()
  .extend({
    /** Required (`true`) when the request changes `lessonType` on a lesson that already has content for its old type — see `curriculum.service.ts#updateLesson`'s content-reset guard (ARCHITECTURE.md §21). Ignored otherwise. */
    confirmContentReset: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.prerequisiteLessonIds &&
      new Set(value.prerequisiteLessonIds).size !== value.prerequisiteLessonIds.length
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate prerequisite lesson ids',
        path: ['prerequisiteLessonIds'],
      })
    }
  })
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>

/**
 * Compact `{id, order}` pairs only — never a full document round-trip
 * (task's own explicit "do not send giant complete lesson documents"
 * guidance). `order` values need only be distinct on arrival; the service
 * re-normalizes them to a contiguous 0-based sequence regardless of what
 * the client sent, so a client-side drag-drop lib's own numbering scheme
 * never has to match the backend's exactly.
 */
const reorderItemSchema = z.object({ id: objectIdSchema, order: z.coerce.number().int().min(0) })

function assertNoDuplicates(items: { id: string; order: number }[], ctx: z.RefinementCtx): void {
  const ids = items.map((item) => item.id)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate ids in reorder payload', path: ['items'] })
  }
  const orders = items.map((item) => item.order)
  if (new Set(orders).size !== orders.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Duplicate order values in reorder payload',
      path: ['items'],
    })
  }
}

export const reorderModulesSchema = z
  .object({ items: z.array(reorderItemSchema).min(1).max(200) })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicates(value.items, ctx)
  })
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>

export const reorderLessonsSchema = z
  .object({ moduleId: objectIdSchema, items: z.array(reorderItemSchema).min(1).max(500) })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicates(value.items, ctx)
  })
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>

export const moveLessonSchema = z
  .object({
    targetModuleId: objectIdSchema,
    targetOrder: z.coerce.number().int().min(0),
  })
  .strict()
export type MoveLessonInput = z.infer<typeof moveLessonSchema>
