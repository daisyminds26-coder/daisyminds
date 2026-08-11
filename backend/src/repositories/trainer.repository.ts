import type { PipelineStage } from 'mongoose'
import type { Types } from 'mongoose'

import { TrainerModel, type ITrainer, type TrainerDocument } from '../models/trainer.model'
import type {
  AvailabilityStatus,
  EmploymentStatus,
  EmploymentType,
  ProfileCompletionStatus,
} from '../models/trainer.model'
import type { UserStatus } from '../models/user.model'

/**
 * Joined shape the list/export aggregation actually returns — mirrors
 * `student.repository.ts#StudentListRow` exactly in spirit: a trainer
 * document's list-relevant fields plus the handful of user fields the UI
 * needs, never the full `IUser`.
 */
export interface TrainerListRow {
  _id: Types.ObjectId
  userId: Types.ObjectId
  trainerId: string
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  designation: string | null
  department: string | null
  expertiseAreas: string[]
  totalYearsExperience: number | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  availabilityStatus: AvailabilityStatus
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  profilePhotoUrl: string | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  email: string
  status: UserStatus
  userIsDeleted: boolean
}

export interface ListTrainersFilter {
  status?: UserStatus
  employmentStatus?: EmploymentStatus
  employmentType?: EmploymentType
  department?: string
  designation?: string
  expertise?: string
  technology?: string
  availabilityStatus?: AvailabilityStatus
  profileCompletionStatus?: ProfileCompletionStatus
  city?: string
  state?: string
  tag?: string
  joiningDateFrom?: Date
  joiningDateTo?: Date
  minExperience?: number
  maxExperience?: number
  search?: string
  includeDeleted?: boolean
}

export interface ListTrainersOptions {
  page: number
  limit: number
  sortField:
    | 'trainerId'
    | 'firstName'
    | 'lastName'
    | 'joiningDate'
    | 'totalYearsExperience'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'employmentStatus'
    | 'profileCompletionPercentage'
  sortDirection: 'asc' | 'desc'
}

export interface ListTrainersResult {
  rows: TrainerListRow[]
  total: number
}

/** Escapes regex metacharacters in user-supplied search input — mirrors `student.repository.ts`/`user.repository.ts`. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Fields that live on the `trainers` document itself — safe to `$match` before the `$lookup` (cheaper). */
function buildPreLookupMatch(filter: ListTrainersFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (filter.employmentStatus) query.employmentStatus = filter.employmentStatus
  if (filter.employmentType) query.employmentType = filter.employmentType
  if (filter.department) query.department = filter.department
  if (filter.designation) query.designation = filter.designation
  if (filter.expertise) query.expertiseAreas = filter.expertise
  if (filter.technology) query.technologies = filter.technology
  if (filter.availabilityStatus) query.availabilityStatus = filter.availabilityStatus
  if (filter.profileCompletionStatus) query.profileCompletionStatus = filter.profileCompletionStatus
  if (filter.city) query['address.city'] = filter.city
  if (filter.state) query['address.state'] = filter.state
  if (filter.tag) query.tags = filter.tag
  if (filter.joiningDateFrom || filter.joiningDateTo) {
    const range: Record<string, Date> = {}
    if (filter.joiningDateFrom) range.$gte = filter.joiningDateFrom
    if (filter.joiningDateTo) range.$lte = filter.joiningDateTo
    query.joiningDate = range
  }
  if (filter.minExperience !== undefined || filter.maxExperience !== undefined) {
    const range: Record<string, number> = {}
    if (filter.minExperience !== undefined) range.$gte = filter.minExperience
    if (filter.maxExperience !== undefined) range.$lte = filter.maxExperience
    query.totalYearsExperience = range
  }

  return query
}

/** Fields that only exist after the `$lookup`/`$unwind` (the joined user) or need both sides combined (search). */
function buildPostLookupMatch(filter: ListTrainersFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (!filter.includeDeleted) {
    // Same rationale as the students module: filters on the *linked user's*
    // isDeleted, not the trainer profile's own — the profile stays alive so
    // future course/batch history keeps a valid reference.
    query['user.isDeleted'] = false
  }
  if (filter.status) {
    query['user.status'] = filter.status
  }
  if (filter.search) {
    const pattern = escapeRegExp(filter.search)
    query.$or = [
      { trainerId: { $regex: pattern, $options: 'i' } },
      { firstName: { $regex: pattern, $options: 'i' } },
      { lastName: { $regex: pattern, $options: 'i' } },
      { phone: { $regex: pattern, $options: 'i' } },
      { designation: { $regex: pattern, $options: 'i' } },
      { department: { $regex: pattern, $options: 'i' } },
      { expertiseAreas: { $regex: pattern, $options: 'i' } },
      { technologies: { $regex: pattern, $options: 'i' } },
      { 'certifications.name': { $regex: pattern, $options: 'i' } },
      { 'user.email': { $regex: `^${pattern}`, $options: 'i' } },
    ]
  }

  return query
}

const LOOKUP_STAGE: PipelineStage = {
  $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' },
}
const UNWIND_STAGE: PipelineStage = { $unwind: '$user' }
const PROJECT_STAGE: PipelineStage = {
  $project: {
    _id: 1,
    userId: 1,
    trainerId: 1,
    firstName: 1,
    lastName: 1,
    middleName: 1,
    displayName: 1,
    designation: 1,
    department: 1,
    expertiseAreas: 1,
    totalYearsExperience: 1,
    employmentType: 1,
    employmentStatus: 1,
    availabilityStatus: 1,
    profileCompletionPercentage: 1,
    profileCompletionStatus: 1,
    profilePhotoUrl: 1,
    isDeleted: 1,
    createdAt: 1,
    updatedAt: 1,
    email: '$user.email',
    status: '$user.status',
    userIsDeleted: '$user.isDeleted',
  },
}

function buildSortField(sortField: ListTrainersOptions['sortField']): string {
  return sortField === 'status' ? 'user.status' : sortField
}

export const trainerRepository = {
  findById(id: string): Promise<TrainerDocument | null> {
    return TrainerModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<TrainerDocument | null> {
    return TrainerModel.findOne({ _id: id })
  },

  findByUserId(userId: string): Promise<TrainerDocument | null> {
    return TrainerModel.findOne({ userId, isDeleted: false })
  },

  create(data: Partial<ITrainer>): Promise<TrainerDocument> {
    return TrainerModel.create(data)
  },

  /**
   * Deliberately loose (`Record<string, unknown>`, not `UpdateQuery<ITrainer>`)
   * — the service builds this update dynamically from a partial input plus
   * merged-in existing values, so a precise structural type would fight the
   * caller for no real safety benefit. Mirrors `student.repository.ts`.
   */
  async updateById(id: string, update: Record<string, unknown>): Promise<TrainerDocument | null> {
    return TrainerModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListTrainersFilter,
    options: ListTrainersOptions,
  ): Promise<ListTrainersResult> {
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [buildSortField(options.sortField)]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const pipeline: PipelineStage[] = [
      { $match: buildPreLookupMatch(filter) },
      LOOKUP_STAGE,
      UNWIND_STAGE,
      { $match: buildPostLookupMatch(filter) },
      PROJECT_STAGE,
      {
        $facet: {
          data: [{ $sort: sort }, { $skip: skip }, { $limit: options.limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await TrainerModel.aggregate<{
      data: TrainerListRow[]
      totalCount: { count: number }[]
    }>(pipeline)

    return {
      rows: result?.data ?? [],
      total: result?.totalCount[0]?.count ?? 0,
    }
  },

  /** Existence check only (non-deleted), not an employment/account-active check — used by `batch-management.service.ts` to validate primary/assistant trainer references at write time; readiness (`batch-readiness.service.ts`) separately checks employment status and linked-user account status before a batch may be scheduled. Mirrors `course.repository.ts#countExistingActiveTrainers`'s identical query. */
  async countExisting(trainerIds: string[]): Promise<number> {
    if (trainerIds.length === 0) return 0
    const uniqueIds = [...new Set(trainerIds)]
    return TrainerModel.countDocuments({ _id: { $in: uniqueIds }, isDeleted: false })
  },

  /** Every filtered row, unpaginated but capped — CSV export needs the full matching set, not one page, but never an unbounded one. */
  async listAllForExport(filter: ListTrainersFilter, maxRows: number): Promise<TrainerListRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: buildPreLookupMatch(filter) },
      LOOKUP_STAGE,
      UNWIND_STAGE,
      { $match: buildPostLookupMatch(filter) },
      PROJECT_STAGE,
      { $sort: { createdAt: -1 } },
      { $limit: maxRows },
    ]

    return TrainerModel.aggregate<TrainerListRow>(pipeline)
  },
}
