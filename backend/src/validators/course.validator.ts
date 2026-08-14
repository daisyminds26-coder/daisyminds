import { z } from 'zod'

import {
  COURSE_LEVELS,
  COURSE_VISIBILITIES,
  DELIVERY_MODES,
  DURATION_UNITS,
  PRICING_TYPES,
} from '../models/course.model'
import { APPROVAL_STATUSES } from '../models/shared/enums'
import { CURRENCY_CODES } from '../models/shared/enums'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const courseIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type CourseIdParam = z.infer<typeof courseIdParamSchema>

const urlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'URL must start with http:// or https://',
  })
  .refine((value) => value.length <= 500, { message: 'URL is too long' })

/** Trimmed, non-empty, length-capped string list — the shape every array-of-short-strings field on this schema shares (tags/skills/outcomes/prerequisites/languages). */
function shortStringArray(maxItemLength: number, maxItems: number) {
  return z.array(z.string().trim().min(1).max(maxItemLength)).max(maxItems)
}

const pricingSchema = z
  .object({
    pricingType: z.enum(PRICING_TYPES).default('FREE'),
    currency: z.enum(CURRENCY_CODES).default('INR'),
    basePrice: z.coerce.number().min(0).max(10_000_000).default(0),
    discountPrice: z.coerce.number().min(0).max(10_000_000).optional(),
    taxInclusive: z.boolean().default(false),
    saleStartsAt: z.coerce.date().optional(),
    saleEndsAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.pricingType === 'PAID' && value.basePrice <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'A paid course requires a base price greater than 0',
        path: ['basePrice'],
      })
    }
    if (value.discountPrice !== undefined && value.discountPrice >= value.basePrice) {
      ctx.addIssue({
        code: 'custom',
        message: 'Discount price must be lower than the base price',
        path: ['discountPrice'],
      })
    }
    if (value.saleStartsAt && value.saleEndsAt && value.saleEndsAt <= value.saleStartsAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Sale end date must be after the sale start date',
        path: ['saleEndsAt'],
      })
    }
  })
export type PricingInput = z.infer<typeof pricingSchema>

/**
 * Zod v4 disallows `.partial()` on a schema that already carries a
 * `.superRefine()` (used below for the duration-value/unit coherence
 * check) — so the base object is kept separate from the refined version.
 * `createCourseSchema` uses the refined schema directly; `updateCourseSchema`
 * calls `.partial()` on this unrefined base first, then re-applies the same
 * coherence check afterward (see below).
 *
 * Deliberately **no** `.default()` on any field here — this object is
 * shared by both the create and update (`.partial()`) schemas, and Zod
 * substitutes a field's default the instant its key is `undefined`
 * (including "absent from the request body entirely"), regardless of
 * `.partial()`/`.optional()` elsewhere. Same empirically-verified rule
 * `question.validator.ts`/`batch.validator.ts` document and guard against
 * (SECURITY.md §4) — this schema was the one instance of the pattern that
 * had not yet been fixed, and a partial course update omitting any of
 * `language`/`secondaryLanguages`/`tags`/`learningOutcomes`/`skills`/
 * `prerequisites`/`certificateEnabled`/`visibility`/`isFeatured`/
 * `eligibleTrainerIds` silently reset it to its default — including
 * flipping `visibility` back to `PRIVATE` on any update that didn't
 * explicitly resend it. Defaults are applied only on `createCourseSchema`
 * below, via `.extend()`.
 */
const courseBaseSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortTitle: z.string().trim().max(80).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase, alphanumeric, and hyphen-separated',
      )
      .optional(),
    shortDescription: z.string().trim().max(300).optional(),
    description: z.string().trim().max(10_000).optional(),
    category: z.string().trim().min(1, 'Category is required').max(100),
    subcategory: z.string().trim().max(100).optional(),
    level: z.enum(COURSE_LEVELS),
    language: z.string().trim().min(1).max(10).optional(),
    secondaryLanguages: shortStringArray(10, 10).optional(),
    tags: shortStringArray(40, 20).optional(),
    durationValue: z.coerce.number().positive().max(1000).optional(),
    durationUnit: z.enum(DURATION_UNITS).optional(),
    deliveryMode: z.enum(DELIVERY_MODES),

    learningOutcomes: shortStringArray(300, 20).optional(),
    skills: shortStringArray(60, 30).optional(),
    prerequisites: shortStringArray(300, 20).optional(),
    targetAudience: z.string().trim().max(500).optional(),
    eligibilityCriteria: z.string().trim().max(500).optional(),
    certificateEnabled: z.boolean().optional(),
    maxStudentCapacity: z.coerce.number().int().positive().max(100_000).optional(),

    pricing: pricingSchema,

    visibility: z.enum(COURSE_VISIBILITIES).optional(),
    isFeatured: z.boolean().optional(),
    featuredOrder: z.coerce.number().int().min(0).optional(),

    metaTitle: z.string().trim().max(70).optional(),
    metaDescription: z.string().trim().max(160).optional(),
    canonicalUrl: urlSchema.optional(),

    eligibleTrainerIds: z.array(objectIdSchema).max(50).optional(),

    internalNotes: z.string().trim().max(2000).optional(),
  })
  .strict()

function requireDurationCoherence(
  value: { durationValue?: number; durationUnit?: string },
  ctx: z.RefinementCtx,
): void {
  if ((value.durationValue === undefined) !== (value.durationUnit === undefined)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Both a duration value and a duration unit are required together',
      path: ['durationUnit'],
    })
  }
}

export const courseProfileSchema = courseBaseSchema
  .extend({
    language: z.string().trim().min(1).max(10).default('en'),
    secondaryLanguages: shortStringArray(10, 10).default([]),
    tags: shortStringArray(40, 20).default([]),
    learningOutcomes: shortStringArray(300, 20).default([]),
    skills: shortStringArray(60, 30).default([]),
    prerequisites: shortStringArray(300, 20).default([]),
    certificateEnabled: z.boolean().default(false),
    visibility: z.enum(COURSE_VISIBILITIES).default('PRIVATE'),
    isFeatured: z.boolean().default(false),
    eligibleTrainerIds: z.array(objectIdSchema).max(50).default([]),
  })
  .strict()
  .superRefine(requireDurationCoherence)

export const createCourseSchema = courseProfileSchema
export type CreateCourseInput = z.infer<typeof createCourseSchema>

/** Every field optional (true partial update) — still `.strict()`. `courseCode` is never part of this schema, so it can never be reassigned via an update body (immutable by construction, not a runtime check). */
export const updateCourseSchema = courseBaseSchema
  .partial()
  .strict()
  .superRefine(requireDurationCoherence)
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>

type SortableField =
  | 'courseCode'
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'pricing.basePrice'
  | 'status'
  | 'featuredOrder'

export const listCoursesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(
        /^(courseCode|title|createdAt|updatedAt|publishedAt|pricing\.basePrice|status|featuredOrder):(asc|desc)$/,
      )
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(APPROVAL_STATUSES).optional(),
    visibility: z.enum(COURSE_VISIBILITIES).optional(),
    level: z.enum(COURSE_LEVELS).optional(),
    deliveryMode: z.enum(DELIVERY_MODES).optional(),
    pricingType: z.enum(PRICING_TYPES).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    language: z.string().trim().min(1).max(10).optional(),
    isFeatured: z.coerce.boolean().optional(),
    certificateEnabled: z.coerce.boolean().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    publishedFrom: z.coerce.date().optional(),
    publishedTo: z.coerce.date().optional(),
    search: z.string().trim().min(1).max(254).optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>

export const exportCoursesQuerySchema = listCoursesQuerySchema.omit({ page: true, limit: true })
export type ExportCoursesQuery = z.infer<typeof exportCoursesQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const COURSE_BULK_ACTIONS = ['publish', 'archive', 'restore', 'delete'] as const
export type CourseBulkAction = (typeof COURSE_BULK_ACTIONS)[number]

export const courseBulkActionSchema = z
  .object({
    action: z.enum(COURSE_BULK_ACTIONS),
    courseIds: z.array(objectIdSchema).min(1).max(100),
  })
  .strict()
export type CourseBulkActionInput = z.infer<typeof courseBulkActionSchema>

export const confirmMediaSchema = z
  .object({
    publicId: z.string().trim().min(1).max(300),
  })
  .strict()
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>
