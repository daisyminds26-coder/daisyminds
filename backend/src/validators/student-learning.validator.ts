import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const lessonParamSchema = z
  .object({ courseId: objectIdSchema, lessonId: objectIdSchema })
  .strict()
export type LessonParam = z.infer<typeof lessonParamSchema>

export const courseProgressParamSchema = z.object({ courseId: objectIdSchema }).strict()
export type CourseProgressParam = z.infer<typeof courseProgressParamSchema>

/**
 * `positionSeconds` only — duration is never accepted from the client
 * (SECURITY.md: never trust client-supplied duration/position for a
 * completion decision). The upper bound is a sanity ceiling (24h), not a
 * real video-length check; the service clamps against the lesson's own
 * Cloudinary-verified `videoAsset.durationSeconds` separately.
 */
export const updateLessonProgressSchema = z
  .object({
    positionSeconds: z.number().min(0).max(86_400),
  })
  .strict()
export type UpdateLessonProgressInput = z.infer<typeof updateLessonProgressSchema>
