import { z } from 'zod'

import {
  COURSE_LEVELS,
  COURSE_VISIBILITIES,
  CURRENCY_CODES,
  DELIVERY_MODES,
  DURATION_UNITS,
  PRICING_TYPES,
} from '@/features/courses/types'

/**
 * Number fields stay validated **strings** end-to-end (converted to numbers
 * only at payload-build time), and dates stay plain `z.date()` — never
 * `z.coerce.*` — mirroring `features/trainers/schemas/trainer.schemas.ts`'s
 * documented reason: coercion makes a Zod schema's *input* type diverge
 * from its *output* type, which breaks `useForm<T>()`'s single-generic
 * `Control<T>` inference every shared `*Field` component depends on.
 */
const numericString = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d*\.?\d*$/, 'Numbers only')
    .max(max)
    .optional()
    .or(z.literal(''))

const urlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'URL must start with http:// or https://',
  })

const shortStringArray = (maxItemLength: number, maxItems: number) =>
  z.array(z.string().trim().min(1).max(maxItemLength)).max(maxItems)

/**
 * Mirrors `backend/src/validators/course.validator.ts`'s `pricingSchema`
 * field constraints — deliberately **without** its cross-field
 * `.superRefine()` rules (paid-requires-price, discount-below-base,
 * sale-end-after-start). A `.superRefine()`/`.refine()` anywhere in the
 * schema tree — even on a field nested inside the top-level object, not
 * just the object itself — turns that branch into a `ZodEffects` wrapper
 * that breaks `zodResolver`'s generic inference for every `Control<T>`-
 * typed `*Field` component on this large a form (see the comment on
 * `createCourseSchema` below for the full explanation; this is the same
 * class of issue, just triggered from one level deeper). The backend
 * re-validates all three rules regardless — never trust frontend input —
 * so a violation surfaces as an API error toast on submit instead of
 * inline, which is an acceptable tradeoff here.
 */
const pricingSchema = z
  .object({
    pricingType: z.enum(PRICING_TYPES).default('FREE'),
    currency: z.enum(CURRENCY_CODES).default('INR'),
    basePrice: numericString(12),
    discountPrice: numericString(12),
    taxInclusive: z.boolean().default(false),
    saleStartsAt: z.date().optional(),
    saleEndsAt: z.date().optional(),
  })
  .strict()

export const courseProfileSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortTitle: z.string().trim().max(80).optional().or(z.literal('')),
    slug: z
      .string()
      .trim()
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only')
      .optional()
      .or(z.literal('')),
    shortDescription: z.string().trim().max(300).optional().or(z.literal('')),
    description: z.string().trim().max(10_000).optional().or(z.literal('')),
    category: z.string().trim().min(1, 'Category is required').max(100),
    subcategory: z.string().trim().max(100).optional().or(z.literal('')),
    level: z.enum(COURSE_LEVELS),
    language: z.string().trim().min(1).max(10).default('en'),
    secondaryLanguages: shortStringArray(10, 10).default([]),
    tags: shortStringArray(40, 20).default([]),
    durationValue: numericString(6),
    durationUnit: z.enum(DURATION_UNITS).optional(),
    deliveryMode: z.enum(DELIVERY_MODES),

    learningOutcomes: shortStringArray(300, 20).default([]),
    skills: shortStringArray(60, 30).default([]),
    prerequisites: shortStringArray(300, 20).default([]),
    targetAudience: z.string().trim().max(500).optional().or(z.literal('')),
    eligibilityCriteria: z.string().trim().max(500).optional().or(z.literal('')),
    certificateEnabled: z.boolean().default(false),
    maxStudentCapacity: numericString(6),

    pricing: pricingSchema,

    visibility: z.enum(COURSE_VISIBILITIES).default('PRIVATE'),
    isFeatured: z.boolean().default(false),
    featuredOrder: numericString(6),

    metaTitle: z.string().trim().max(70).optional().or(z.literal('')),
    metaDescription: z.string().trim().max(160).optional().or(z.literal('')),
    canonicalUrl: urlSchema.optional().or(z.literal('')),

    eligibleTrainerIds: z.array(z.string()).max(50).default([]),

    internalNotes: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .strict()

export const createCourseSchema = courseProfileSchema

/**
 * `z.input`, not `z.infer`/`z.output` — this schema has many `.default(...)`
 * fields (`language`, `tags`, `visibility`, `pricing.pricingType`, etc.).
 * `z.infer` gives the *post-parse* shape, where every defaulted field is
 * required; RHF's `useForm<TFieldValues>` needs the *pre-parse* shape a
 * form actually holds before submission, where those same fields are
 * optional (the default fills in at parse time, not before). Using
 * `z.infer` here compiles fine in isolation but makes `zodResolver`'s own
 * overload resolution silently fall back to an unconstrained generic once
 * enough defaulted fields are present — surfacing as every `Control<T>`-
 * typed `*Field` component on the form failing to type-check against a
 * `TFieldValues` that never resolves. `z.input` is the type every test
 * fixture in this codebase already uses for the same reason (see
 * `student-fixtures.ts`/`trainer-fixtures.ts`'s own `z.input` comments) —
 * this is that same rule applied to a *form*'s values instead of a
 * *request payload* fixture.
 */
export type CreateCourseFormValues = z.input<typeof createCourseSchema>

/** The edit form is flat and always submits every field's current value (not a true partial delta) — same shape as the create schema, mirroring `trainer.schemas.ts`'s `updateTrainerSchema`. */
export const updateCourseSchema = courseProfileSchema
export type UpdateCourseFormValues = z.input<typeof updateCourseSchema>
