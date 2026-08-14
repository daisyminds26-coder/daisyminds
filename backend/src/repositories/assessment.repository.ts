import {
  AssessmentModel,
  type AssessmentStatus,
  type AssessmentType,
  type IAssessment,
  type AssessmentDocument,
} from '../models/assessment.model'

export interface ListAssessmentsFilter {
  courseId?: string
  batchId?: string
  assessmentType?: AssessmentType
  status?: AssessmentStatus
  search?: string
}

export interface ListAssessmentsOptions {
  page: number
  limit: number
  sortField: 'openAt' | 'createdAt'
  sortDirection: 'asc' | 'desc'
}

export interface ListAssessmentsResult {
  rows: AssessmentDocument[]
  total: number
}

function buildFilterQuery(filter: ListAssessmentsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = { isDeleted: false }
  if (filter.courseId) query.courseId = filter.courseId
  if (filter.batchId) query.batchIds = filter.batchId
  if (filter.assessmentType) query.assessmentType = filter.assessmentType
  if (filter.status) query.status = filter.status
  if (filter.search) {
    const pattern = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { assessmentCode: { $regex: pattern, $options: 'i' } },
      { title: { $regex: pattern, $options: 'i' } },
    ]
  }
  return query
}

export const assessmentRepository = {
  findById(id: string): Promise<AssessmentDocument | null> {
    return AssessmentModel.findOne({ _id: id, isDeleted: false })
  },

  findByIds(ids: string[]): Promise<AssessmentDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return AssessmentModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  create(data: Partial<IAssessment>): Promise<AssessmentDocument> {
    return AssessmentModel.create(data)
  },

  updateById(id: string, update: Record<string, unknown>): Promise<AssessmentDocument | null> {
    return AssessmentModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListAssessmentsFilter,
    options: ListAssessmentsOptions,
  ): Promise<ListAssessmentsResult> {
    const query = buildFilterQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      AssessmentModel.find(query).sort(sort).skip(skip).limit(options.limit),
      AssessmentModel.countDocuments(query),
    ])

    return { rows, total }
  },

  /** Every assessment visible to a student across a set of batches — filtered to student-visible statuses at the call site's own `isAssessmentStudentVisible`, not here (mirrors `assignment.repository.ts#findForBatches`'s "return broadly, filter at the service layer" shape). */
  findForBatches(batchIds: string[]): Promise<AssessmentDocument[]> {
    if (batchIds.length === 0) return Promise.resolve([])
    return AssessmentModel.find({
      batchIds: { $in: batchIds },
      isDeleted: false,
      status: { $in: ['PUBLISHED', 'CLOSED', 'RESULT_PUBLISHED'] },
    }).sort({ openAt: 1 })
  },

  /** Every assessment targeting any batch this trainer teaches, any status — the trainer self-service list's own read. */
  findForBatchesAnyStatus(
    batchIds: string[],
    filter: ListAssessmentsFilter,
  ): Promise<AssessmentDocument[]> {
    if (batchIds.length === 0) return Promise.resolve([])
    const query = buildFilterQuery({ ...filter, batchId: undefined })
    query.batchIds = { $in: batchIds }
    return AssessmentModel.find(query).sort({ openAt: 1 })
  },
}
