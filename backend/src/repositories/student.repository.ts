import type { PipelineStage } from 'mongoose'
import type { Types } from 'mongoose'

import { StudentModel, type IStudent, type StudentDocument } from '../models/student.model'
import type { Gender, ProfileCompletionStatus, StudentSource } from '../models/student.model'
import type { UserStatus } from '../models/user.model'

/**
 * Joined shape the list/export aggregation actually returns — a student
 * document's fields plus the handful of user fields the UI needs (email,
 * account status), never the full `IUser` (password hash etc. never
 * touches this pipeline in the first place — the `$project` below is an
 * allowlist, not a denylist).
 */
export interface StudentListRow {
  _id: Types.ObjectId
  userId: Types.ObjectId
  studentId: string
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  phone: string | null
  address: IStudent['address']
  admissionDate: Date | null
  gender: Gender | null
  source: StudentSource | null
  tags: string[]
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

export interface ListStudentsFilter {
  status?: UserStatus
  gender?: Gender
  state?: string
  city?: string
  source?: StudentSource
  tag?: string
  profileCompletionStatus?: ProfileCompletionStatus
  admissionDateFrom?: Date
  admissionDateTo?: Date
  search?: string
  includeDeleted?: boolean
}

export interface ListStudentsOptions {
  page: number
  limit: number
  sortField:
    'studentId' | 'firstName' | 'lastName' | 'admissionDate' | 'createdAt' | 'updatedAt' | 'status'
  sortDirection: 'asc' | 'desc'
}

export interface ListStudentsResult {
  rows: StudentListRow[]
  total: number
}

/** Escapes regex metacharacters in user-supplied search input before building a `$regex` filter — mirrors user.repository.ts. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Everything except `search`/`status`/`includeDeleted` targets a field that
 * lives on the `students` document itself, so it's safe to `$match` before
 * the `$lookup` (cheaper — filters the smaller side of the join first,
 * before joining ever happens is even cheaper still where the field allows
 * it).
 */
function buildPreLookupMatch(filter: ListStudentsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (filter.gender) query.gender = filter.gender
  if (filter.state) query['address.state'] = filter.state
  if (filter.city) query['address.city'] = filter.city
  if (filter.source) query.source = filter.source
  if (filter.tag) query.tags = filter.tag
  if (filter.profileCompletionStatus) query.profileCompletionStatus = filter.profileCompletionStatus
  if (filter.admissionDateFrom || filter.admissionDateTo) {
    const range: Record<string, Date> = {}
    if (filter.admissionDateFrom) range.$gte = filter.admissionDateFrom
    if (filter.admissionDateTo) range.$lte = filter.admissionDateTo
    query.admissionDate = range
  }

  return query
}

/** Fields that only exist after the `$lookup`/`$unwind` (the joined user) or need both sides combined (search). */
function buildPostLookupMatch(filter: ListStudentsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (!filter.includeDeleted) {
    // Deliberate: filters on the *linked user's* isDeleted, not the student
    // profile's own — DATABASE.md §3.2 keeps a student profile alive
    // (isDeleted: false) even once its account is soft-deleted, so
    // enrollment/attendance/grade history keeps a valid reference. See
    // ARCHITECTURE.md's Student Management section for the full rationale.
    query['user.isDeleted'] = false
  }
  if (filter.status) {
    query['user.status'] = filter.status
  }
  if (filter.search) {
    const pattern = escapeRegExp(filter.search)
    query.$or = [
      { studentId: { $regex: pattern, $options: 'i' } },
      { firstName: { $regex: pattern, $options: 'i' } },
      { lastName: { $regex: pattern, $options: 'i' } },
      { phone: { $regex: pattern, $options: 'i' } },
      { alternatePhone: { $regex: pattern, $options: 'i' } },
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
    studentId: 1,
    firstName: 1,
    lastName: 1,
    middleName: 1,
    displayName: 1,
    phone: 1,
    address: 1,
    admissionDate: 1,
    gender: 1,
    source: 1,
    tags: 1,
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

function buildSortField(sortField: ListStudentsOptions['sortField']): string {
  return sortField === 'status' ? 'user.status' : sortField
}

export const studentRepository = {
  findById(id: string): Promise<StudentDocument | null> {
    return StudentModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<StudentDocument | null> {
    return StudentModel.findOne({ _id: id })
  },

  findByUserId(userId: string): Promise<StudentDocument | null> {
    return StudentModel.findOne({ userId, isDeleted: false })
  },

  create(data: Partial<IStudent>): Promise<StudentDocument> {
    return StudentModel.create(data)
  },

  /**
   * Deliberately loose (`Record<string, unknown>`, not `UpdateQuery<IStudent>`)
   * — the service builds this update dynamically from a partial input plus
   * merged-in existing values (student-management.service.ts#updateStudent),
   * so a precise structural type would fight the caller for no real safety
   * benefit. Mirrors `user.repository.ts`'s `UserFilter` for the same
   * "Mongoose 9 doesn't export a usable structural type here" reason.
   */
  async updateById(id: string, update: Record<string, unknown>): Promise<StudentDocument | null> {
    return StudentModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListStudentsFilter,
    options: ListStudentsOptions,
  ): Promise<ListStudentsResult> {
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

    const [result] = await StudentModel.aggregate<{
      data: StudentListRow[]
      totalCount: { count: number }[]
    }>(pipeline)

    return {
      rows: result?.data ?? [],
      total: result?.totalCount[0]?.count ?? 0,
    }
  },

  /** Every filtered row, unpaginated but capped — CSV export needs the full matching set, not one page, but never an unbounded one (Performance section). */
  async listAllForExport(filter: ListStudentsFilter, maxRows: number): Promise<StudentListRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: buildPreLookupMatch(filter) },
      LOOKUP_STAGE,
      UNWIND_STAGE,
      { $match: buildPostLookupMatch(filter) },
      PROJECT_STAGE,
      { $sort: { createdAt: -1 } },
      { $limit: maxRows },
    ]

    return StudentModel.aggregate<StudentListRow>(pipeline)
  },
}
