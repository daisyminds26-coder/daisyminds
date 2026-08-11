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

export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type CourseStatus = (typeof COURSE_STATUSES)[number]

export const CURRENCY_CODES = ['INR', 'USD'] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export const COURSE_BULK_ACTIONS = ['publish', 'archive', 'restore', 'delete'] as const
export type CourseBulkAction = (typeof COURSE_BULK_ACTIONS)[number]

export interface AdminPricing {
  pricingType: PricingType
  currency: CurrencyCode
  basePrice: number
  discountPrice: number | null
  displayPrice: number
  taxInclusive: boolean
  saleStartsAt: string | null
  saleEndsAt: string | null
}

export interface AdminCourseListItem {
  id: string
  courseCode: string
  title: string
  slug: string
  category: string
  level: CourseLevel
  deliveryMode: DeliveryMode
  pricing: AdminPricing
  status: CourseStatus
  visibility: CourseVisibility
  isFeatured: boolean
  certificateEnabled: boolean
  thumbnailUrl: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface AdminCourse extends AdminCourseListItem {
  shortTitle: string | null
  shortDescription: string
  description: string
  subcategory: string | null
  language: string
  secondaryLanguages: string[]
  tags: string[]
  durationValue: number | null
  durationUnit: DurationUnit | null
  learningOutcomes: string[]
  skills: string[]
  prerequisites: string[]
  targetAudience: string | null
  eligibilityCriteria: string | null
  maxStudentCapacity: number | null
  featuredOrder: number | null
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  thumbnailPublicId: string | null
  bannerUrl: string | null
  bannerPublicId: string | null
  eligibleTrainerIds: string[]
  internalNotes: string | null
  archivedAt: string | null
}

export interface ReadinessBlocker {
  field: string
  message: string
}

export interface ReadinessResult {
  ready: boolean
  blockers: ReadinessBlocker[]
}

export interface CourseBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actorRole: string | null
  createdAt: string
}

export type SortField =
  | 'courseCode'
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'pricing.basePrice'
  | 'status'
  | 'featuredOrder'
export type SortDirection = 'asc' | 'desc'

export interface ListCoursesParams {
  page?: number
  limit?: number
  sort?: `${SortField}:${SortDirection}`
  status?: CourseStatus
  visibility?: CourseVisibility
  level?: CourseLevel
  deliveryMode?: DeliveryMode
  pricingType?: PricingType
  category?: string
  language?: string
  isFeatured?: boolean
  certificateEnabled?: boolean
  search?: string
  includeDeleted?: boolean
}

export interface SignedUploadParams {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  allowedFormats: readonly string[]
  maxFileSize: number
}
