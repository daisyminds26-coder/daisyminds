import { Types } from 'mongoose'

import {
  LiveClassModel,
  type ILiveClass,
  type LiveClassDocument,
  type LiveClassStatus,
  type LiveClassProvider,
} from '../models/live-class.model'

export interface ListLiveClassesFilter {
  batchId?: string
  courseId?: string
  trainerId?: string
  status?: LiveClassStatus
  provider?: LiveClassProvider
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface ListLiveClassesOptions {
  page: number
  limit: number
  sortField: 'startDateTime' | 'createdAt'
  sortDirection: 'asc' | 'desc'
}

export interface ListLiveClassesResult {
  rows: LiveClassDocument[]
  total: number
}

const ACTIVE_STATUSES: LiveClassStatus[] = ['SCHEDULED', 'LIVE']

function buildFilterQuery(filter: ListLiveClassesFilter): Record<string, unknown> {
  const query: Record<string, unknown> = { isDeleted: false }
  if (filter.batchId) query.batchId = filter.batchId
  if (filter.courseId) query.courseId = filter.courseId
  if (filter.trainerId) query.trainerIds = filter.trainerId
  if (filter.status) query.status = filter.status
  if (filter.provider) query.provider = filter.provider
  if (filter.dateFrom || filter.dateTo) {
    const range: Record<string, Date> = {}
    if (filter.dateFrom) range.$gte = filter.dateFrom
    if (filter.dateTo) range.$lte = filter.dateTo
    query.startDateTime = range
  }
  if (filter.search) {
    const pattern = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { sessionCode: { $regex: pattern, $options: 'i' } },
      { title: { $regex: pattern, $options: 'i' } },
    ]
  }
  return query
}

export const liveClassRepository = {
  findById(id: string): Promise<LiveClassDocument | null> {
    return LiveClassModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<LiveClassDocument | null> {
    return LiveClassModel.findOne({ _id: id })
  },

  findByIds(ids: string[]): Promise<LiveClassDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return LiveClassModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  create(data: Partial<ILiveClass>): Promise<LiveClassDocument> {
    return LiveClassModel.create(data)
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<LiveClassDocument | null> {
    return LiveClassModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(
    filter: ListLiveClassesFilter,
    options: ListLiveClassesOptions,
  ): Promise<ListLiveClassesResult> {
    const query = buildFilterQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      LiveClassModel.find(query).sort(sort).skip(skip).limit(options.limit),
      LiveClassModel.countDocuments(query),
    ])

    return { rows, total }
  },

  /**
   * Existing SCHEDULED/LIVE sessions for any of the given trainers whose
   * time range overlaps `[startDateTime, endDateTime)` — an indexed range
   * query (`{trainerIds, startDateTime}`/`{primaryTrainerId, startDateTime}`),
   * never a JS scan across all sessions (task's own explicit instruction).
   * Classic interval-overlap predicate: `existing.start < new.end AND
   * existing.end > new.start`.
   */
  findOverlappingForTrainers(
    trainerIds: string[],
    startDateTime: Date,
    endDateTime: Date,
    excludeSessionId?: string,
  ): Promise<LiveClassDocument[]> {
    if (trainerIds.length === 0) return Promise.resolve([])
    const query: Record<string, unknown> = {
      isDeleted: false,
      status: { $in: ACTIVE_STATUSES },
      trainerIds: { $in: trainerIds.map((id) => new Types.ObjectId(id)) },
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    }
    if (excludeSessionId) query._id = { $ne: excludeSessionId }
    return LiveClassModel.find(query)
  },

  /** A timetable-generated occurrence already exists for this exact batch/date/instant — the service-layer duplicate check the unique partial index backs up. */
  existsGeneratedOccurrence(
    batchId: string,
    scheduledDate: Date,
    startDateTime: Date,
  ): Promise<boolean> {
    return LiveClassModel.exists({
      batchId,
      scheduledDate,
      startDateTime,
      source: 'TIMETABLE_GENERATED',
      isDeleted: false,
    }).then(Boolean)
  },

  /** Upcoming (or currently-live) sessions across a set of batches, for the student Schedule/Dashboard "prefer a real session over the derived timetable occurrence" precedence rule. */
  findUpcomingForBatches(batchIds: string[], from: Date, to: Date): Promise<LiveClassDocument[]> {
    if (batchIds.length === 0) return Promise.resolve([])
    return LiveClassModel.find({
      batchId: { $in: batchIds },
      isDeleted: false,
      // CANCELLED is included deliberately: callers need it both to show a
      // session's "clear cancelled state" to students and to suppress a
      // derived timetable occurrence for a date the session was cancelled
      // on (never fall back to a phantom slot that will not happen).
      status: { $in: [...ACTIVE_STATUSES, 'COMPLETED', 'CANCELLED'] },
      startDateTime: { $gte: from, $lte: to },
    }).sort({ startDateTime: 1 })
  },

  findForTrainer(trainerId: string, filter: ListLiveClassesFilter): Promise<LiveClassDocument[]> {
    const query = buildFilterQuery({ ...filter, trainerId })
    return LiveClassModel.find(query).sort({ startDateTime: 1 })
  },

  /** Every finalized session for a course — the attendance-percentage denominator's own read. */
  findFinalizedForCourse(courseId: string): Promise<LiveClassDocument[]> {
    return LiveClassModel.find({
      courseId,
      isDeleted: false,
      attendanceStatus: 'FINALIZED',
      status: { $ne: 'CANCELLED' },
    }).sort({ startDateTime: 1 })
  },
}
