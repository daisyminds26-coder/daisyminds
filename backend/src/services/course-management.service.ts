import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import { auditLogRepository } from '../repositories/audit-log.repository'
import {
  courseRepository,
  type ListCoursesFilter,
  type ListCoursesOptions,
} from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { generateCourseCode } from './course-id.service'
import {
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import type {
  CourseDocument,
  CourseLevel,
  CourseVisibility,
  DeliveryMode,
  DurationUnit,
  IPricing,
  PricingType,
} from '../models/course.model'
import type { ApprovalStatus } from '../models/shared/enums'
import type {
  CourseBulkAction,
  CreateCourseInput,
  PricingInput,
  UpdateCourseInput,
} from '../validators/course.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

/** Hard cap on an unpaginated export — never load an unbounded result set. Mirrors `trainer-management.service.ts`. */
const MAX_EXPORT_ROWS = 5000

export interface PricingDto {
  pricingType: PricingType
  currency: string
  basePrice: number
  discountPrice: number | null
  displayPrice: number
  taxInclusive: boolean
  saleStartsAt: string | null
  saleEndsAt: string | null
}

export interface AdminCourseListItemDto {
  id: string
  courseCode: string
  title: string
  slug: string
  category: string
  level: CourseLevel
  deliveryMode: DeliveryMode
  pricing: PricingDto
  status: ApprovalStatus
  visibility: CourseVisibility
  isFeatured: boolean
  certificateEnabled: boolean
  thumbnailUrl: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface AdminCourseDto extends AdminCourseListItemDto {
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

function toPricingDto(pricing: IPricing): PricingDto {
  const displayPrice =
    pricing.pricingType === 'FREE' ? 0 : (pricing.discountPrice ?? pricing.basePrice)

  return {
    pricingType: pricing.pricingType,
    currency: pricing.currency,
    basePrice: pricing.basePrice,
    discountPrice: pricing.discountPrice,
    displayPrice,
    taxInclusive: pricing.taxInclusive,
    saleStartsAt: pricing.saleStartsAt ? pricing.saleStartsAt.toISOString() : null,
    saleEndsAt: pricing.saleEndsAt ? pricing.saleEndsAt.toISOString() : null,
  }
}

function toListItemDto(course: CourseDocument): AdminCourseListItemDto {
  return {
    id: course._id.toString(),
    courseCode: course.courseCode,
    title: course.title,
    slug: course.slug,
    category: course.category,
    level: course.level,
    deliveryMode: course.deliveryMode,
    pricing: toPricingDto(course.pricing),
    status: course.status,
    visibility: course.visibility,
    isFeatured: course.isFeatured,
    certificateEnabled: course.certificateEnabled,
    thumbnailUrl: course.thumbnailUrl,
    isDeleted: course.isDeleted,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    publishedAt: course.publishedAt ? course.publishedAt.toISOString() : null,
  }
}

function toDto(course: CourseDocument): AdminCourseDto {
  return {
    ...toListItemDto(course),
    shortTitle: course.shortTitle,
    shortDescription: course.shortDescription,
    description: course.description,
    subcategory: course.subcategory,
    language: course.language,
    secondaryLanguages: course.secondaryLanguages,
    tags: course.tags,
    durationValue: course.durationValue,
    durationUnit: course.durationUnit,
    learningOutcomes: course.learningOutcomes,
    skills: course.skills,
    prerequisites: course.prerequisites,
    targetAudience: course.targetAudience,
    eligibilityCriteria: course.eligibilityCriteria,
    maxStudentCapacity: course.maxStudentCapacity,
    featuredOrder: course.featuredOrder,
    metaTitle: course.metaTitle,
    metaDescription: course.metaDescription,
    canonicalUrl: course.canonicalUrl,
    thumbnailPublicId: course.thumbnailPublicId,
    bannerUrl: course.bannerUrl,
    bannerPublicId: course.bannerPublicId,
    eligibleTrainerIds: course.eligibleTrainerIds.map((id) => id.toString()),
    internalNotes: course.internalNotes,
    archivedAt: course.archivedAt ? course.archivedAt.toISOString() : null,
  }
}

/** Lowercase, alphanumeric, hyphen-separated — matches `courseProfileSchema`'s `slug` regex exactly, so a server-derived slug is always accepted by the same rule a client-supplied one is. */
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Appends `-2`, `-3`, ... only if the base slug is already taken — the common case (a genuinely unique title) never pays for the extra lookup beyond the first. */
async function generateUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const normalized = normalizeSlug(base) || 'course'
  let candidate = normalized
  let suffix = 2

  while (await courseRepository.findBySlug(candidate, excludeId)) {
    candidate = `${normalized}-${String(suffix)}`
    suffix += 1
  }

  return candidate
}

async function assertEligibleTrainersValid(trainerIds: string[]): Promise<void> {
  if (trainerIds.length === 0) return
  const uniqueIds = [...new Set(trainerIds)]
  const activeCount = await courseRepository.countExistingActiveTrainers(uniqueIds)
  if (activeCount !== uniqueIds.length) {
    throw ApiError.badRequest('One or more eligible trainers do not exist or are inactive', [
      { field: 'eligibleTrainerIds', message: 'All referenced trainers must exist and be active' },
    ])
  }
}

/**
 * Free courses must not retain stale paid-pricing fields (task's own
 * explicit rule) — normalized server-side regardless of what the client
 * sent, so a course that's ever been marked FREE can never accidentally
 * display a leftover discount/sale window from when it was PAID.
 */
function normalizePricing(pricing: PricingInput | undefined): IPricing {
  if (!pricing || pricing.pricingType === 'FREE') {
    return {
      pricingType: 'FREE',
      currency: pricing?.currency ?? 'INR',
      basePrice: 0,
      discountPrice: null,
      taxInclusive: false,
      saleStartsAt: null,
      saleEndsAt: null,
    }
  }

  return {
    pricingType: pricing.pricingType,
    currency: pricing.currency,
    basePrice: pricing.basePrice,
    discountPrice: pricing.discountPrice ?? null,
    taxInclusive: pricing.taxInclusive,
    saleStartsAt: pricing.saleStartsAt ?? null,
    saleEndsAt: pricing.saleEndsAt ?? null,
  }
}

/**
 * The single source of truth for "can this course be published" — used by
 * both the dedicated `POST /courses/:id/readiness-check` endpoint and the
 * `publish` action itself (which rejects with the same blocker list rather
 * than duplicating the rule set). A thumbnail is required by this product's
 * own publication bar (task: "Thumbnail if required by product rules") —
 * documented in ARCHITECTURE.md.
 */
function checkReadiness(course: CourseDocument): ReadinessResult {
  const blockers: ReadinessBlocker[] = []

  if (!course.title.trim()) blockers.push({ field: 'title', message: 'Title is required' })
  if (!course.slug.trim()) blockers.push({ field: 'slug', message: 'Slug is required' })
  if (!course.description.trim()) {
    blockers.push({ field: 'description', message: 'Description is required' })
  }
  if (!course.category.trim()) blockers.push({ field: 'category', message: 'Category is required' })
  if (!course.language.trim()) blockers.push({ field: 'language', message: 'Language is required' })
  if (!course.durationValue || !course.durationUnit) {
    blockers.push({ field: 'durationValue', message: 'Duration is required' })
  }
  if (!course.thumbnailUrl) {
    blockers.push({ field: 'thumbnailUrl', message: 'A thumbnail image is required to publish' })
  }
  if (course.learningOutcomes.length === 0) {
    blockers.push({
      field: 'learningOutcomes',
      message: 'At least one learning outcome is required',
    })
  }
  if (course.pricing.pricingType === 'PAID' && course.pricing.basePrice <= 0) {
    blockers.push({
      field: 'pricing.basePrice',
      message: 'A paid course requires a base price greater than 0',
    })
  }

  return { ready: blockers.length === 0, blockers }
}

interface ChangeSet {
  update: Record<string, unknown>
  pricingChanged: boolean
  visibilityChanged: boolean
  eligibleTrainersChanged: boolean
}

function buildChangeSet(course: CourseDocument, input: UpdateCourseInput): ChangeSet {
  const update: Record<string, unknown> = {}
  let pricingChanged = false
  let visibilityChanged = false
  let eligibleTrainersChanged = false

  for (const [key, value] of Object.entries(input)) {
    if (key === 'pricing') {
      update.pricing = normalizePricing(value as PricingInput)
      pricingChanged = true
      continue
    }
    if (key === 'visibility' && value !== course.visibility) {
      visibilityChanged = true
    }
    if (key === 'eligibleTrainerIds') {
      const next = [...(value as string[])].sort()
      const previous = course.eligibleTrainerIds.map((id) => id.toString()).sort()
      if (JSON.stringify(next) !== JSON.stringify(previous)) eligibleTrainersChanged = true
    }
    update[key] = value
  }

  return { update, pricingChanged, visibilityChanged, eligibleTrainersChanged }
}

export const courseManagementService = {
  async listCourses(
    filter: ListCoursesFilter,
    options: ListCoursesOptions,
  ): Promise<{ dtos: AdminCourseListItemDto[]; total: number }> {
    const { rows, total } = await courseRepository.list(filter, options)
    return { dtos: rows.map(toListItemDto), total }
  },

  async exportCoursesCsv(
    filter: ListCoursesFilter,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const rows = await courseRepository.listAllForExport(filter, MAX_EXPORT_ROWS)

    const columns = [
      'Course Code',
      'Title',
      'Category',
      'Level',
      'Delivery Mode',
      'Pricing Type',
      'Base Price',
      'Discount Price',
      'Currency',
      'Status',
      'Visibility',
      'Featured',
      'Certificate Enabled',
      'Created At',
      'Published At',
    ]
    const csvRows = rows.map((course) => [
      course.courseCode,
      course.title,
      course.category,
      course.level,
      course.deliveryMode,
      course.pricing.pricingType,
      course.pricing.basePrice.toString(),
      course.pricing.discountPrice?.toString() ?? '',
      course.pricing.currency,
      course.status,
      course.visibility,
      course.isFeatured ? 'Yes' : 'No',
      course.certificateEnabled ? 'Yes' : 'No',
      course.createdAt.toISOString(),
      course.publishedAt ? course.publishedAt.toISOString() : '',
    ])

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.exported',
      entityType: 'course',
      entityId: actor.id,
      metadata: { count: rows.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toCsv(columns, csvRows)
  },

  async getCourseById(id: string): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    return toDto(course)
  },

  async createCourse(
    input: CreateCourseInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    await assertEligibleTrainersValid(input.eligibleTrainerIds)

    const courseCode = await generateCourseCode()
    const slug = await generateUniqueSlug(input.slug ?? input.title)

    const course = await courseRepository.create({
      ...input,
      courseCode,
      slug,
      pricing: normalizePricing(input.pricing),
      eligibleTrainerIds: input.eligibleTrainerIds.map((tid) => new Types.ObjectId(tid)),
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.created',
      entityType: 'course',
      entityId: course._id,
      metadata: { courseCode: course.courseCode, title: course.title },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(course)
  },

  async updateCourse(
    id: string,
    input: UpdateCourseInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    if (input.eligibleTrainerIds) {
      await assertEligibleTrainersValid(input.eligibleTrainerIds)
    }

    let nextSlug: string | undefined
    if (input.slug !== undefined) {
      nextSlug = await generateUniqueSlug(input.slug, id)
    }

    const { update, pricingChanged, visibilityChanged, eligibleTrainersChanged } = buildChangeSet(
      course,
      input,
    )
    if (nextSlug) update.slug = nextSlug
    update.updatedBy = actor.id

    const updated = await courseRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Course not found')

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.updated',
      entityType: 'course',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    if (pricingChanged) {
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'course.pricing_changed',
        entityType: 'course',
        entityId: updated._id,
        metadata: { pricing: updated.pricing },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }
    if (visibilityChanged) {
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'course.visibility_changed',
        entityType: 'course',
        entityId: updated._id,
        metadata: { visibility: updated.visibility },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }
    if (eligibleTrainersChanged) {
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'course.eligible_trainers_changed',
        entityType: 'course',
        entityId: updated._id,
        metadata: { eligibleTrainerIds: updated.eligibleTrainerIds.map((tid) => tid.toString()) },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    return toDto(updated)
  },

  async getReadiness(id: string): Promise<ReadinessResult> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    return checkReadiness(course)
  },

  async publishCourse(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    if (course.eligibleTrainerIds.length > 0) {
      await assertEligibleTrainersValid(course.eligibleTrainerIds.map((tid) => tid.toString()))
    }

    const readiness = checkReadiness(course)
    if (!readiness.ready) {
      throw ApiError.unprocessable('Course is not ready to publish', readiness.blockers)
    }

    const updated = await courseRepository.updateById(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.published',
      entityType: 'course',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async unpublishCourse(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    if (course.status !== 'PUBLISHED') {
      throw ApiError.conflict('Only a published course can be unpublished')
    }

    const updated = await courseRepository.updateById(id, { status: 'DRAFT', updatedBy: actor.id })
    if (!updated) throw ApiError.notFound('Course not found')

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.unpublished',
      entityType: 'course',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async archiveCourse(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    if (course.status === 'ARCHIVED') {
      throw ApiError.conflict('Course is already archived')
    }

    const updated = await courseRepository.updateById(id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.archived',
      entityType: 'course',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  /**
   * A single, dual-purpose "undo the most recent negative lifecycle
   * action" operation (matches the task's own single suggested `/restore`
   * route, rather than two separate endpoints): if the course is
   * soft-deleted, un-delete it first (status untouched — whatever it was
   * when deleted); otherwise, if it's `ARCHIVED`, bring it back to `DRAFT`
   * (never straight back to `PUBLISHED` — a re-publish is a deliberate,
   * separate action, not implied by restore).
   */
  async restoreCourse(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findByIdIncludingDeleted(id)
    if (!course) throw ApiError.notFound('Course not found')

    if (course.isDeleted) {
      const updated = await courseRepository.updateById(id, {
        isDeleted: false,
        deletedAt: null,
        updatedBy: actor.id,
      })
      if (!updated) throw ApiError.notFound('Course not found')

      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'course.restored',
        entityType: 'course',
        entityId: updated._id,
        metadata: { from: 'deleted' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return toDto(updated)
    }

    if (course.status !== 'ARCHIVED') {
      throw ApiError.conflict('Only an archived or deleted course can be restored')
    }

    const updated = await courseRepository.updateById(id, {
      status: 'DRAFT',
      archivedAt: null,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.restored',
      entityType: 'course',
      entityId: updated._id,
      metadata: { from: 'archived' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async softDeleteCourse(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    /** Phase 10B guard — a course with a live batch or a non-terminal enrollment (across any of its batches) must not be soft-deleted. */
    if (
      (await batchRepository.existsNonArchivedForCourse(id)) ||
      (await enrollmentRepository.existsNonTerminalForCourse(id))
    ) {
      throw ApiError.conflict(
        'This course has active batches or enrollments and cannot be deleted — archive its batches first',
      )
    }

    await courseRepository.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: actor.id,
    })

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.soft_deleted',
      entityType: 'course',
      entityId: course._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async bulkAction(
    action: CourseBulkAction,
    courseIds: string[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<CourseBulkActionResult> {
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of courseIds) {
      try {
        if (action === 'publish') {
          await courseManagementService.publishCourse(id, actor, context)
        } else if (action === 'archive') {
          await courseManagementService.archiveCourse(id, actor, context)
        } else if (action === 'restore') {
          await courseManagementService.restoreCourse(id, actor, context)
        } else {
          await courseManagementService.softDeleteCourse(id, actor, context)
        }
        succeeded.push(id)
      } catch (error) {
        const reason = error instanceof ApiError ? error.message : 'Unexpected error'
        failed.push({ id, reason })
      }
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.bulk_action',
      entityType: 'course',
      entityId: actor.id,
      metadata: { action, succeeded, failed },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return { succeeded, failed }
  },

  async getAuditTimeline(
    id: string,
    page: number,
    limit: number,
  ): Promise<{ entries: unknown[]; total: number }> {
    const { entries, total } = await auditLogRepository.findByEntity('course', id, page, limit)
    return {
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        action: entry.action,
        actorId: entry.actorId ? entry.actorId.toString() : null,
        actorRole: entry.actorRole,
        createdAt: entry.createdAt.toISOString(),
      })),
      total,
    }
  },

  async getThumbnailUploadSignature(id: string): Promise<SignedUploadParams> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    const folder = `daisy-minds/courses/${id}/thumbnail`
    const publicId = `${folder}/thumbnail-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId)
  },

  async confirmThumbnail(
    id: string,
    publicId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    const folder = `daisy-minds/courses/${id}/thumbnail`
    const { secureUrl } = await verifyUploadedAsset(publicId, folder)
    const previousPublicId = course.thumbnailPublicId

    const updated = await courseRepository.updateById(id, {
      thumbnailUrl: secureUrl,
      thumbnailPublicId: publicId,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    if (previousPublicId) await deleteAsset(previousPublicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.media_changed',
      entityType: 'course',
      entityId: updated._id,
      metadata: { field: 'thumbnail' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async removeThumbnail(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    if (!course.thumbnailPublicId) {
      throw ApiError.unprocessable('This course has no thumbnail to remove.')
    }

    const publicId = course.thumbnailPublicId
    const updated = await courseRepository.updateById(id, {
      thumbnailUrl: null,
      thumbnailPublicId: null,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    await deleteAsset(publicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.media_changed',
      entityType: 'course',
      entityId: updated._id,
      metadata: { field: 'thumbnail', removed: true },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async getBannerUploadSignature(id: string): Promise<SignedUploadParams> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    const folder = `daisy-minds/courses/${id}/banner`
    const publicId = `${folder}/banner-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId)
  },

  async confirmBanner(
    id: string,
    publicId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')

    const folder = `daisy-minds/courses/${id}/banner`
    const { secureUrl } = await verifyUploadedAsset(publicId, folder)
    const previousPublicId = course.bannerPublicId

    const updated = await courseRepository.updateById(id, {
      bannerUrl: secureUrl,
      bannerPublicId: publicId,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    if (previousPublicId) await deleteAsset(previousPublicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.media_changed',
      entityType: 'course',
      entityId: updated._id,
      metadata: { field: 'banner' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },

  async removeBanner(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminCourseDto> {
    const course = await courseRepository.findById(id)
    if (!course) throw ApiError.notFound('Course not found')
    if (!course.bannerPublicId) {
      throw ApiError.unprocessable('This course has no banner to remove.')
    }

    const publicId = course.bannerPublicId
    const updated = await courseRepository.updateById(id, {
      bannerUrl: null,
      bannerPublicId: null,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Course not found')

    await deleteAsset(publicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'course.media_changed',
      entityType: 'course',
      entityId: updated._id,
      metadata: { field: 'banner', removed: true },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated)
  },
}
