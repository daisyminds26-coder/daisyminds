import { z } from 'zod'

import { COURSE_LEVELS, DELIVERY_MODES } from '../models/course.model'

/**
 * Deliberately narrower than `course.validator.ts`'s admin
 * `listCoursesQuerySchema` — no `status`/`visibility`/`includeDeleted` (the
 * public service hardcodes `PUBLISHED`/`PUBLIC` itself, never from the
 * client), a much smaller sortable-field set, and a lower page-size cap
 * since this is public-facing.
 */
type PublicSortableField = 'featuredOrder' | 'title' | 'publishedAt'

export const listPublicProgramsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(12),
    sort: z
      .string()
      .regex(/^(featuredOrder|title|publishedAt):(asc|desc)$/)
      .default('featuredOrder:asc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [PublicSortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    category: z.string().trim().min(1).max(100).optional(),
    level: z.enum(COURSE_LEVELS).optional(),
    deliveryMode: z.enum(DELIVERY_MODES).optional(),
    featured: z.coerce.boolean().optional(),
    search: z.string().trim().min(1).max(254).optional(),
  })
  .strict()
export type ListPublicProgramsQuery = z.infer<typeof listPublicProgramsQuerySchema>

export const publicProgramSlugParamSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
  })
  .strict()
export type PublicProgramSlugParam = z.infer<typeof publicProgramSlugParamSchema>
