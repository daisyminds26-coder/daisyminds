import type { ClientSession, PipelineStage } from 'mongoose'
import { Types } from 'mongoose'

import {
  EnrollmentModel,
  type IEnrollment,
  type EnrollmentDocument,
  type EnrollmentStatus,
} from '../models/enrollment.model'
import { TERMINAL_ENROLLMENT_STATUSES } from '../utils/enrollment-lifecycle.util'

/** Joined shape the list/export aggregation returns — enrollment fields plus the handful of student/batch/course fields the admin UI needs, never the full linked documents. */
export interface EnrollmentListRow {
  _id: Types.ObjectId
  enrollmentCode: string
  studentId: Types.ObjectId
  batchId: Types.ObjectId
  courseId: Types.ObjectId
  status: EnrollmentStatus
  source: string
  enrollmentDate: Date
  waitlistPosition: number | null
  activatedAt: Date | null
  completedAt: Date | null
  accessStartsAt: Date | null
  accessEndsAt: Date | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  studentCode: string | null
  studentFirstName: string | null
  studentLastName: string | null
  studentEmail: string | null
  batchCode: string | null
  batchName: string | null
  batchStatus: string | null
  courseCode: string | null
  courseTitle: string | null
}

export interface WaitlistRow {
  _id: Types.ObjectId
  enrollmentCode: string
  studentId: Types.ObjectId
  waitlistedAt: Date | null
  waitlistPosition: number | null
  studentCode: string | null
  studentFirstName: string | null
  studentLastName: string | null
}

export interface ListEnrollmentsFilter {
  status?: EnrollmentStatus
  studentId?: string
  batchId?: string
  courseId?: string
  source?: string
  search?: string
  createdFrom?: Date
  createdTo?: Date
  includeDeleted?: boolean
}

export interface ListEnrollmentsOptions {
  page: number
  limit: number
  sortField:
    'createdAt' | 'enrollmentCode' | 'status' | 'enrollmentDate' | 'activatedAt' | 'completedAt'
  sortDirection: 'asc' | 'desc'
}

export interface ListEnrollmentsResult {
  rows: EnrollmentListRow[]
  total: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Aggregation `$match` stages, unlike `find()`/`findOne()`, never
 * auto-cast query values against the schema — a plain string compared to
 * an ObjectId field silently matches nothing. Every ObjectId-typed filter
 * must be explicitly wrapped here before it ever reaches a `$match`.
 */
function buildPreLookupMatch(filter: ListEnrollmentsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (!filter.includeDeleted) query.isDeleted = false
  if (filter.status) query.status = filter.status
  if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId)
  if (filter.batchId) query.batchId = new Types.ObjectId(filter.batchId)
  if (filter.courseId) query.courseId = new Types.ObjectId(filter.courseId)
  if (filter.source) query.source = filter.source
  if (filter.createdFrom || filter.createdTo) {
    const range: Record<string, Date> = {}
    if (filter.createdFrom) range.$gte = filter.createdFrom
    if (filter.createdTo) range.$lte = filter.createdTo
    query.createdAt = range
  }
  return query
}

function buildPostLookupMatch(filter: ListEnrollmentsFilter): Record<string, unknown> {
  if (!filter.search) return {}
  const pattern = escapeRegExp(filter.search)
  return {
    $or: [
      { enrollmentCode: { $regex: pattern, $options: 'i' } },
      { studentCode: { $regex: pattern, $options: 'i' } },
      { studentFirstName: { $regex: pattern, $options: 'i' } },
      { studentLastName: { $regex: pattern, $options: 'i' } },
      { batchCode: { $regex: pattern, $options: 'i' } },
      { batchName: { $regex: pattern, $options: 'i' } },
      { courseCode: { $regex: pattern, $options: 'i' } },
      { courseTitle: { $regex: pattern, $options: 'i' } },
    ],
  }
}

const LOOKUP_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: 'students',
      localField: 'studentId',
      foreignField: '_id',
      as: 'student',
    },
  },
  { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'users',
      localField: 'student.userId',
      foreignField: '_id',
      as: 'studentUser',
    },
  },
  { $unwind: { path: '$studentUser', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'batches', localField: 'batchId', foreignField: '_id', as: 'batch' } },
  { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
  { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
]

const PROJECT_STAGE: PipelineStage = {
  $project: {
    _id: 1,
    enrollmentCode: 1,
    studentId: 1,
    batchId: 1,
    courseId: 1,
    status: 1,
    source: 1,
    enrollmentDate: 1,
    waitlistPosition: 1,
    activatedAt: 1,
    completedAt: 1,
    accessStartsAt: 1,
    accessEndsAt: 1,
    isDeleted: 1,
    createdAt: 1,
    updatedAt: 1,
    studentCode: '$student.studentId',
    studentFirstName: '$student.firstName',
    studentLastName: '$student.lastName',
    studentEmail: '$studentUser.email',
    batchCode: '$batch.batchCode',
    batchName: '$batch.name',
    batchStatus: '$batch.status',
    courseCode: '$course.courseCode',
    courseTitle: '$course.title',
  },
}

export const enrollmentRepository = {
  findById(id: string): Promise<EnrollmentDocument | null> {
    return EnrollmentModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<EnrollmentDocument | null> {
    return EnrollmentModel.findOne({ _id: id })
  },

  /** The one non-terminal (or any, if `includeTerminal`) enrollment for a student+batch pair — the authoritative duplicate check (richer than the schema's own unique-index backstop, which can't express "non-terminal"). */
  findByStudentAndBatch(
    studentId: string,
    batchId: string,
    options: { includeTerminal?: boolean } = {},
  ): Promise<EnrollmentDocument | null> {
    const query: Record<string, unknown> = { studentId, batchId, isDeleted: false }
    if (!options.includeTerminal) {
      query.status = { $nin: TERMINAL_ENROLLMENT_STATUSES }
    }
    return EnrollmentModel.findOne(query)
  },

  /** Same-course-different-batch guard — at most one non-terminal seat-consuming-or-pending enrollment per student per course (excludes the enrollment being transferred away from, when given). */
  findNonTerminalByStudentAndCourse(
    studentId: string,
    courseId: string,
    excludeEnrollmentId?: string,
  ): Promise<EnrollmentDocument | null> {
    const query: Record<string, unknown> = {
      studentId,
      courseId,
      isDeleted: false,
      status: { $nin: TERMINAL_ENROLLMENT_STATUSES },
    }
    if (excludeEnrollmentId) query._id = { $ne: excludeEnrollmentId }
    return EnrollmentModel.findOne(query)
  },

  create(data: Partial<IEnrollment>, session?: ClientSession): Promise<EnrollmentDocument> {
    return EnrollmentModel.create([data], { session }).then((docs) => {
      const doc = docs[0]
      if (!doc) throw new Error('Enrollment creation returned no document')
      return doc
    })
  },

  async updateById(
    id: string,
    update: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<EnrollmentDocument | null> {
    return EnrollmentModel.findByIdAndUpdate(id, update, { new: true, session })
  },

  async list(
    filter: ListEnrollmentsFilter,
    options: ListEnrollmentsOptions,
  ): Promise<ListEnrollmentsResult> {
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const pipeline: PipelineStage[] = [
      { $match: buildPreLookupMatch(filter) },
      ...LOOKUP_STAGES,
      PROJECT_STAGE,
      { $match: buildPostLookupMatch(filter) },
      {
        $facet: {
          data: [{ $sort: sort }, { $skip: skip }, { $limit: options.limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await EnrollmentModel.aggregate<{
      data: EnrollmentListRow[]
      totalCount: { count: number }[]
    }>(pipeline)

    return {
      rows: result?.data ?? [],
      total: result?.totalCount[0]?.count ?? 0,
    }
  },

  async listAllForExport(
    filter: ListEnrollmentsFilter,
    maxRows: number,
  ): Promise<EnrollmentListRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: buildPreLookupMatch(filter) },
      ...LOOKUP_STAGES,
      PROJECT_STAGE,
      { $match: buildPostLookupMatch(filter) },
      { $sort: { createdAt: -1 } },
      { $limit: maxRows },
    ]
    return EnrollmentModel.aggregate<EnrollmentListRow>(pipeline)
  },

  /** Waitlist queue for one batch, oldest-first — indexed by `{batchId, waitlistedAt, waitlistPosition}`, joined with the handful of student display fields the admin UI needs (never a per-row follow-up query). */
  async findWaitlistForBatch(batchId: string): Promise<WaitlistRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: { batchId: new Types.ObjectId(batchId), status: 'WAITLISTED', isDeleted: false } },
      {
        $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          enrollmentCode: 1,
          studentId: 1,
          waitlistedAt: 1,
          waitlistPosition: 1,
          studentCode: '$student.studentId',
          studentFirstName: '$student.firstName',
          studentLastName: '$student.lastName',
        },
      },
      { $sort: { waitlistedAt: 1, waitlistPosition: 1 } },
    ]
    return EnrollmentModel.aggregate<WaitlistRow>(pipeline)
  },

  /** Authoritative seat-truth count for reconciliation — never called on a normal request path. */
  countSeatConsumingForBatch(
    batchId: string,
    statuses: readonly EnrollmentStatus[],
  ): Promise<number> {
    return EnrollmentModel.countDocuments({ batchId, status: { $in: statuses }, isDeleted: false })
  },

  /** Any non-terminal enrollment referencing a batch — the batch-delete-protection guard. */
  existsNonTerminalForBatch(batchId: string): Promise<boolean> {
    return EnrollmentModel.exists({
      batchId,
      isDeleted: false,
      status: { $nin: TERMINAL_ENROLLMENT_STATUSES },
    }).then(Boolean)
  },

  /** Any non-terminal enrollment referencing a course (across all its batches) — the course-delete-protection guard. */
  existsNonTerminalForCourse(courseId: string): Promise<boolean> {
    return EnrollmentModel.exists({
      courseId,
      isDeleted: false,
      status: { $nin: TERMINAL_ENROLLMENT_STATUSES },
    }).then(Boolean)
  },

  /** Any non-terminal enrollment for a student — the student-delete-protection guard. */
  existsNonTerminalForStudent(studentId: string): Promise<boolean> {
    return EnrollmentModel.exists({
      studentId,
      isDeleted: false,
      status: { $nin: TERMINAL_ENROLLMENT_STATUSES },
    }).then(Boolean)
  },

  /** The single enrollment (if any) currently granting a student access to a course — `ACTIVE`, or `COMPLETED` with an open/future access window. Used by `enrollment-access.service.ts`. */
  findAccessGrantingForStudentCourse(
    studentId: string,
    courseId: string,
  ): Promise<EnrollmentDocument | null> {
    return EnrollmentModel.findOne({
      studentId,
      courseId,
      isDeleted: false,
      $or: [
        { status: 'ACTIVE' },
        {
          status: 'COMPLETED',
          $or: [{ accessEndsAt: null }, { accessEndsAt: { $gt: new Date() } }],
        },
      ],
    })
  },
}
