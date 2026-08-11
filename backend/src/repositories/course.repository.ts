import { CourseModel, type CourseDocument, type ICourse } from '../models/course.model'
import type {
  CourseLevel,
  CourseVisibility,
  DeliveryMode,
  PricingType,
} from '../models/course.model'
import type { ApprovalStatus } from '../models/shared/enums'
import { TrainerModel } from '../models/trainer.model'

/**
 * Unlike `student.repository.ts`/`trainer.repository.ts`, a course has no
 * linked `users` document to `$lookup` — it's a single, self-contained
 * collection, so list/export here is a plain filtered/paginated/sorted
 * query, not an aggregation pipeline.
 */
export interface ListCoursesFilter {
  status?: ApprovalStatus
  visibility?: CourseVisibility
  level?: CourseLevel
  deliveryMode?: DeliveryMode
  pricingType?: PricingType
  category?: string
  language?: string
  isFeatured?: boolean
  certificateEnabled?: boolean
  createdFrom?: Date
  createdTo?: Date
  publishedFrom?: Date
  publishedTo?: Date
  search?: string
  includeDeleted?: boolean
}

export interface ListCoursesOptions {
  page: number
  limit: number
  sortField:
    | 'courseCode'
    | 'title'
    | 'createdAt'
    | 'updatedAt'
    | 'publishedAt'
    | 'pricing.basePrice'
    | 'status'
    | 'featuredOrder'
  sortDirection: 'asc' | 'desc'
}

export interface ListCoursesResult {
  rows: CourseDocument[]
  total: number
}

/** Escapes regex metacharacters in user-supplied search input — mirrors `trainer.repository.ts`/`student.repository.ts`. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Mongoose 9 no longer exports a `FilterQuery` type — this is deliberately loose, matching `user.repository.ts`'s workaround. */
function buildQuery(filter: ListCoursesFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (!filter.includeDeleted) query.isDeleted = false
  if (filter.status) query.status = filter.status
  if (filter.visibility) query.visibility = filter.visibility
  if (filter.level) query.level = filter.level
  if (filter.deliveryMode) query.deliveryMode = filter.deliveryMode
  if (filter.pricingType) query['pricing.pricingType'] = filter.pricingType
  if (filter.category) query.category = filter.category
  if (filter.language) query.language = filter.language
  if (filter.isFeatured !== undefined) query.isFeatured = filter.isFeatured
  if (filter.certificateEnabled !== undefined) query.certificateEnabled = filter.certificateEnabled

  if (filter.createdFrom || filter.createdTo) {
    query.createdAt = {
      ...(filter.createdFrom ? { $gte: filter.createdFrom } : {}),
      ...(filter.createdTo ? { $lte: filter.createdTo } : {}),
    }
  }
  if (filter.publishedFrom || filter.publishedTo) {
    query.publishedAt = {
      ...(filter.publishedFrom ? { $gte: filter.publishedFrom } : {}),
      ...(filter.publishedTo ? { $lte: filter.publishedTo } : {}),
    }
  }

  if (filter.search) {
    const pattern = escapeRegExp(filter.search)
    query.$or = [
      { courseCode: { $regex: pattern, $options: 'i' } },
      { title: { $regex: pattern, $options: 'i' } },
      { shortTitle: { $regex: pattern, $options: 'i' } },
      { slug: { $regex: pattern, $options: 'i' } },
      { category: { $regex: pattern, $options: 'i' } },
      { tags: { $regex: pattern, $options: 'i' } },
      { skills: { $regex: pattern, $options: 'i' } },
    ]
  }

  return query
}

export const courseRepository = {
  findById(id: string): Promise<CourseDocument | null> {
    return CourseModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<CourseDocument | null> {
    return CourseModel.findOne({ _id: id })
  },

  findBySlug(slug: string, excludeId?: string): Promise<CourseDocument | null> {
    return CourseModel.findOne({
      slug,
      isDeleted: false,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  },

  create(data: Partial<ICourse>): Promise<CourseDocument> {
    return CourseModel.create(data)
  },

  /** Deliberately loose (`Record<string, unknown>`) — the service builds this dynamically from a partial input. Mirrors `trainer.repository.ts`. */
  async updateById(id: string, update: Record<string, unknown>): Promise<CourseDocument | null> {
    return CourseModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(filter: ListCoursesFilter, options: ListCoursesOptions): Promise<ListCoursesResult> {
    const query = buildQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      CourseModel.find(query).sort(sort).skip(skip).limit(options.limit),
      CourseModel.countDocuments(query),
    ])

    return { rows, total }
  },

  /** Every filtered row, unpaginated but capped — mirrors `trainer.repository.ts#listAllForExport`. */
  async listAllForExport(filter: ListCoursesFilter, maxRows: number): Promise<CourseDocument[]> {
    const query = buildQuery(filter)
    return CourseModel.find(query).sort({ createdAt: -1 }).limit(maxRows)
  },

  /** Used by publication-readiness / eligible-trainer validation to confirm referenced trainers still exist and are active. */
  async countExistingActiveTrainers(trainerIds: string[]): Promise<number> {
    if (trainerIds.length === 0) return 0
    return TrainerModel.countDocuments({ _id: { $in: trainerIds }, isDeleted: false })
  },
}
