import {
  QuestionModel,
  type IQuestion,
  type QuestionDocument,
  type QuestionType,
  type QuestionDifficulty,
  type QuestionStatus,
} from '../models/question.model'

export interface ListQuestionsFilter {
  courseId?: string
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  status?: QuestionStatus
  tag?: string
  search?: string
}

export interface ListQuestionsOptions {
  page: number
  limit: number
  sortField: 'createdAt' | 'questionText'
  sortDirection: 'asc' | 'desc'
}

export interface ListQuestionsResult {
  rows: QuestionDocument[]
  total: number
}

function buildFilterQuery(filter: ListQuestionsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = { isDeleted: false }
  if (filter.courseId) query.courseId = filter.courseId
  if (filter.questionType) query.questionType = filter.questionType
  if (filter.difficulty) query.difficulty = filter.difficulty
  if (filter.status) query.status = filter.status
  if (filter.tag) query.tags = filter.tag
  if (filter.search) {
    const pattern = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { questionCode: { $regex: pattern, $options: 'i' } },
      { questionText: { $regex: pattern, $options: 'i' } },
    ]
  }
  return query
}

export const questionRepository = {
  findById(id: string): Promise<QuestionDocument | null> {
    return QuestionModel.findOne({ _id: id, isDeleted: false })
  },

  findByIds(ids: string[]): Promise<QuestionDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return QuestionModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  /** Every question referenced by an assessment section's `questionIds`, active-status-filtered — the authoring UI's own picker read (draft/archived questions must remain individually resolvable for an assessment already referencing them, but never surfaced as newly-pickable). */
  findActiveByIds(ids: string[]): Promise<QuestionDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return QuestionModel.find({ _id: { $in: ids }, isDeleted: false, status: 'ACTIVE' })
  },

  create(data: Partial<IQuestion>): Promise<QuestionDocument> {
    return QuestionModel.create(data)
  },

  updateById(id: string, update: Record<string, unknown>): Promise<QuestionDocument | null> {
    return QuestionModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListQuestionsFilter,
    options: ListQuestionsOptions,
  ): Promise<ListQuestionsResult> {
    const query = buildFilterQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      QuestionModel.find(query).sort(sort).skip(skip).limit(options.limit),
      QuestionModel.countDocuments(query),
    ])

    return { rows, total }
  },
}
