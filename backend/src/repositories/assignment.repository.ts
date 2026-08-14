import {
  AssignmentModel,
  type AssignmentStatus,
  type IAssignment,
  type AssignmentDocument,
} from '../models/assignment.model'

export interface ListAssignmentsFilter {
  courseId?: string
  batchId?: string
  status?: AssignmentStatus
  search?: string
}

export interface ListAssignmentsOptions {
  page: number
  limit: number
  sortField: 'dueDateTime' | 'createdAt'
  sortDirection: 'asc' | 'desc'
}

export interface ListAssignmentsResult {
  rows: AssignmentDocument[]
  total: number
}

function buildFilterQuery(filter: ListAssignmentsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = { isDeleted: false }
  if (filter.courseId) query.courseId = filter.courseId
  if (filter.batchId) query.batchIds = filter.batchId
  if (filter.status) query.status = filter.status
  if (filter.search) {
    const pattern = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { assignmentCode: { $regex: pattern, $options: 'i' } },
      { title: { $regex: pattern, $options: 'i' } },
    ]
  }
  return query
}

export const assignmentRepository = {
  findById(id: string): Promise<AssignmentDocument | null> {
    return AssignmentModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<AssignmentDocument | null> {
    return AssignmentModel.findOne({ _id: id })
  },

  findByIds(ids: string[]): Promise<AssignmentDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return AssignmentModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  create(data: Partial<IAssignment>): Promise<AssignmentDocument> {
    return AssignmentModel.create(data)
  },

  updateById(id: string, update: Record<string, unknown>): Promise<AssignmentDocument | null> {
    return AssignmentModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListAssignmentsFilter,
    options: ListAssignmentsOptions,
  ): Promise<ListAssignmentsResult> {
    const query = buildFilterQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      AssignmentModel.find(query).sort(sort).skip(skip).limit(options.limit),
      AssignmentModel.countDocuments(query),
    ])

    return { rows, total }
  },

  /** Every assignment visible to a student across a set of batches — filtered to student-visible statuses at the call site, not here (mirrors `live-class.repository.ts#findUpcomingForBatches`'s "return broadly, filter at the service layer" shape). */
  findForBatches(batchIds: string[]): Promise<AssignmentDocument[]> {
    if (batchIds.length === 0) return Promise.resolve([])
    return AssignmentModel.find({
      batchIds: { $in: batchIds },
      isDeleted: false,
      status: { $in: ['PUBLISHED', 'CLOSED'] },
    }).sort({ dueDateTime: 1 })
  },

  /** Every assignment targeting any batch this trainer teaches — the trainer self-service list's own read. */
  findForBatchesAnyStatus(
    batchIds: string[],
    filter: ListAssignmentsFilter,
  ): Promise<AssignmentDocument[]> {
    if (batchIds.length === 0) return Promise.resolve([])
    const query = buildFilterQuery({ ...filter, batchId: undefined })
    query.batchIds = { $in: batchIds }
    return AssignmentModel.find(query).sort({ dueDateTime: 1 })
  },
}
