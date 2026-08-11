import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import {
  APPROVAL_STATUSES,
  CURRENCY_CODES,
  type ApprovalStatus,
  type CurrencyCode,
} from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const
export type CourseLevel = (typeof COURSE_LEVELS)[number]

export const DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID', 'SELF_PACED'] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export const DURATION_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS'] as const
export type DurationUnit = (typeof DURATION_UNITS)[number]

export const PRICING_TYPES = ['FREE', 'PAID'] as const
export type PricingType = (typeof PRICING_TYPES)[number]

export const COURSE_VISIBILITIES = ['PRIVATE', 'INTERNAL', 'PUBLIC'] as const
export type CourseVisibility = (typeof COURSE_VISIBILITIES)[number]

export interface IPricing {
  pricingType: PricingType
  currency: CurrencyCode
  basePrice: number
  discountPrice: number | null
  taxInclusive: boolean
  saleStartsAt: Date | null
  saleEndsAt: Date | null
}

/**
 * Top of the academic hierarchy: Course -> course_modules -> lessons.
 * `status` (the shared `ApprovalStatus` enum, also used by
 * assignments/quizzes/examinations) gates catalog visibility (DRAFT never
 * shown to students). Soft delete is active here (not hard-delete) because
 * published courses may have historical enrollments/certificates
 * referencing them — DATABASE.md §2.2.
 *
 * Phase 9A extends the Phase 1 scaffold additively, with one deliberate
 * exception: the scaffold's single `durationHours` field is replaced by
 * `durationValue`+`durationUnit` (a course can now be duration-scoped in
 * days/weeks/months, not just hours) — safe because no service/route ever
 * read or wrote `durationHours` before this phase. `promoVideoUrl` is left
 * in place but untouched/unexposed by this phase's API (no course video
 * upload yet, ARCHITECTURE.md §19).
 */
export interface ICourse extends AuditFields {
  courseCode: string
  title: string
  shortTitle: string | null
  slug: string
  shortDescription: string
  description: string
  category: string
  subcategory: string | null
  level: CourseLevel
  language: string
  secondaryLanguages: string[]
  tags: string[]
  durationValue: number | null
  durationUnit: DurationUnit | null
  deliveryMode: DeliveryMode

  learningOutcomes: string[]
  skills: string[]
  prerequisites: string[]
  targetAudience: string | null
  eligibilityCriteria: string | null
  certificateEnabled: boolean
  maxStudentCapacity: number | null

  pricing: IPricing

  visibility: CourseVisibility
  status: ApprovalStatus
  isFeatured: boolean
  featuredOrder: number | null

  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null

  thumbnailUrl: string | null
  thumbnailPublicId: string | null
  bannerUrl: string | null
  bannerPublicId: string | null
  /** Dormant — no course-video upload flow exists yet (out of scope, Phase 9A). */
  promoVideoUrl: string | null

  eligibleTrainerIds: Types.ObjectId[]

  internalNotes: string | null
  publishedAt: Date | null
  archivedAt: Date | null
}

export type CourseDocument = HydratedDocument<ICourse>

const pricingSchema = new Schema<IPricing>(
  {
    pricingType: { type: String, enum: PRICING_TYPES, default: 'FREE' },
    currency: { type: String, enum: CURRENCY_CODES, default: 'INR' },
    basePrice: { type: Number, required: true, default: 0, min: 0 },
    discountPrice: { type: Number, default: null, min: 0 },
    taxInclusive: { type: Boolean, default: false },
    saleStartsAt: { type: Date, default: null },
    saleEndsAt: { type: Date, default: null },
  },
  { _id: false },
)

const courseSchema = new Schema<ICourse>({
  courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  shortTitle: { type: String, default: null, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 220 },
  shortDescription: { type: String, default: '', trim: true, maxlength: 300 },
  description: { type: String, default: '', trim: true, maxlength: 10_000 },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  subcategory: { type: String, default: null, trim: true, maxlength: 100 },
  level: { type: String, enum: COURSE_LEVELS, required: true },
  language: { type: String, default: 'en', trim: true, maxlength: 10 },
  secondaryLanguages: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  durationValue: { type: Number, default: null, min: 0 },
  durationUnit: { type: String, enum: DURATION_UNITS, default: null },
  deliveryMode: { type: String, enum: DELIVERY_MODES, required: true },

  learningOutcomes: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  prerequisites: { type: [String], default: [] },
  targetAudience: { type: String, default: null, trim: true, maxlength: 500 },
  eligibilityCriteria: { type: String, default: null, trim: true, maxlength: 500 },
  certificateEnabled: { type: Boolean, default: false },
  maxStudentCapacity: { type: Number, default: null, min: 1 },

  pricing: { type: pricingSchema, required: true, default: () => ({}) },

  visibility: { type: String, enum: COURSE_VISIBILITIES, default: 'PRIVATE' },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  isFeatured: { type: Boolean, default: false },
  featuredOrder: { type: Number, default: null },

  metaTitle: { type: String, default: null, trim: true, maxlength: 70 },
  metaDescription: { type: String, default: null, trim: true, maxlength: 160 },
  canonicalUrl: { type: String, default: null, trim: true, maxlength: 500 },

  thumbnailUrl: { type: String, default: null },
  thumbnailPublicId: { type: String, default: null },
  bannerUrl: { type: String, default: null },
  bannerPublicId: { type: String, default: null },
  promoVideoUrl: { type: String, default: null },

  eligibleTrainerIds: { type: [Schema.Types.ObjectId], ref: 'Trainer', default: [] },

  internalNotes: { type: String, default: null, trim: true, maxlength: 2000 },
  publishedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },

  ...auditFieldsDefinition,
})

applyAuditPlugin(courseSchema)

courseSchema.index(
  { courseCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
courseSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
courseSchema.index({ status: 1, category: 1 })
courseSchema.index({ level: 1 })
courseSchema.index({ visibility: 1 })
courseSchema.index({ isFeatured: 1, featuredOrder: 1 })
courseSchema.index({ tags: 1 })
courseSchema.index({ title: 'text', description: 'text', tags: 'text', skills: 'text' })

export const CourseModel = model<ICourse>('Course', courseSchema, 'courses')
