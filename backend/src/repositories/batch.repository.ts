import type { ClientSession } from 'mongoose'

import { BatchModel, type BatchDocument, type IBatch } from '../models/batch.model'
import type { BatchDeliveryMode, BatchStatus } from '../models/batch.model'

/** Unlike `trainer.repository.ts`, list/export here is a plain filtered/paginated/sorted query, not a `$lookup` aggregation — course/trainer *names* are resolved separately by the service layer only for the handful of rows actually rendered (list page, CSV), never joined for every filter/sort. */
export interface ListBatchesFilter {
  status?: BatchStatus
  courseId?: string
  primaryTrainerId?: string
  deliveryMode?: BatchDeliveryMode
  timezone?: string
  startDateFrom?: Date
  startDateTo?: Date
  endDateFrom?: Date
  endDateTo?: Date
  temporal?: 'upcoming' | 'current' | 'past'
  minCapacity?: number
  maxCapacity?: number
  waitlistEnabled?: boolean
  createdFrom?: Date
  createdTo?: Date
  search?: string
  includeDeleted?: boolean
}

export interface ListBatchesOptions {
  page: number
  limit: number
  sortField:
    | 'batchCode'
    | 'name'
    | 'startDate'
    | 'endDate'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'maxStudents'
  sortDirection: 'asc' | 'desc'
}

export interface ListBatchesResult {
  rows: BatchDocument[]
  total: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildQuery(filter: ListBatchesFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  const now = new Date()

  if (!filter.includeDeleted) query.isDeleted = false
  if (filter.status) query.status = filter.status
  if (filter.courseId) query.courseId = filter.courseId
  if (filter.primaryTrainerId) query.primaryTrainerId = filter.primaryTrainerId
  if (filter.deliveryMode) query.deliveryMode = filter.deliveryMode
  if (filter.timezone) query.timezone = filter.timezone
  if (filter.waitlistEnabled !== undefined) query.waitlistEnabled = filter.waitlistEnabled

  if (filter.startDateFrom || filter.startDateTo) {
    query.startDate = {
      ...(filter.startDateFrom ? { $gte: filter.startDateFrom } : {}),
      ...(filter.startDateTo ? { $lte: filter.startDateTo } : {}),
    }
  }
  if (filter.endDateFrom || filter.endDateTo) {
    query.endDate = {
      ...(filter.endDateFrom ? { $gte: filter.endDateFrom } : {}),
      ...(filter.endDateTo ? { $lte: filter.endDateTo } : {}),
    }
  }
  if (filter.temporal === 'upcoming') query.startDate = { ...(query.startDate as object), $gt: now }
  if (filter.temporal === 'past') query.endDate = { ...(query.endDate as object), $lt: now }
  if (filter.temporal === 'current') {
    query.startDate = { ...(query.startDate as object), $lte: now }
    query.endDate = { ...(query.endDate as object), $gte: now }
  }

  if (filter.minCapacity !== undefined || filter.maxCapacity !== undefined) {
    query.maxStudents = {
      ...(filter.minCapacity !== undefined ? { $gte: filter.minCapacity } : {}),
      ...(filter.maxCapacity !== undefined ? { $lte: filter.maxCapacity } : {}),
    }
  }

  if (filter.createdFrom || filter.createdTo) {
    query.createdAt = {
      ...(filter.createdFrom ? { $gte: filter.createdFrom } : {}),
      ...(filter.createdTo ? { $lte: filter.createdTo } : {}),
    }
  }

  if (filter.search) {
    const pattern = escapeRegExp(filter.search)
    query.$or = [
      { batchCode: { $regex: pattern, $options: 'i' } },
      { name: { $regex: pattern, $options: 'i' } },
      { shortName: { $regex: pattern, $options: 'i' } },
      { tags: { $regex: pattern, $options: 'i' } },
    ]
  }

  return query
}

export const batchRepository = {
  findById(id: string): Promise<BatchDocument | null> {
    return BatchModel.findOne({ _id: id, isDeleted: false })
  },

  findByIdIncludingDeleted(id: string): Promise<BatchDocument | null> {
    return BatchModel.findOne({ _id: id })
  },

  create(data: Partial<IBatch>): Promise<BatchDocument> {
    return BatchModel.create(data)
  },

  /** Deliberately loose (`Record<string, unknown>`) — the service builds this dynamically from a partial input. Mirrors `course.repository.ts`/`trainer.repository.ts`. */
  async updateById(id: string, update: Record<string, unknown>): Promise<BatchDocument | null> {
    return BatchModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(filter: ListBatchesFilter, options: ListBatchesOptions): Promise<ListBatchesResult> {
    const query = buildQuery(filter)
    const skip = (options.page - 1) * options.limit
    const sort: Record<string, 1 | -1> = {
      [options.sortField]: options.sortDirection === 'asc' ? 1 : -1,
    }

    const [rows, total] = await Promise.all([
      BatchModel.find(query).sort(sort).skip(skip).limit(options.limit),
      BatchModel.countDocuments(query),
    ])

    return { rows, total }
  },

  /** Every filtered row, unpaginated but capped — mirrors `course.repository.ts#listAllForExport`. */
  async listAllForExport(filter: ListBatchesFilter, maxRows: number): Promise<BatchDocument[]> {
    const query = buildQuery(filter)
    return BatchModel.find(query).sort({ createdAt: -1 }).limit(maxRows)
  },

  /**
   * Candidate set for cross-batch trainer-conflict detection
   * (`batch-conflict.service.ts`) — every currently-operational batch
   * (`SCHEDULED`/`ACTIVE`) where the trainer is assigned as primary or
   * assistant, excluding the batch being checked itself. The service layer
   * does the actual weekly-slot overlap comparison on this narrowed,
   * indexed candidate set — never a full collection scan.
   */
  findOperationalBatchesForTrainer(
    trainerId: string,
    excludeBatchId?: string,
  ): Promise<BatchDocument[]> {
    return BatchModel.find({
      isDeleted: false,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      $or: [{ primaryTrainerId: trainerId }, { assistantTrainerIds: trainerId }],
      ...(excludeBatchId ? { _id: { $ne: excludeBatchId } } : {}),
    })
  },

  /**
   * Atomically reserves one seat — a single-document `findOneAndUpdate`
   * with `$expr` comparing two fields of the *same* document
   * (`occupiedSeats < maxStudents`), which a plain query-predicate filter
   * cannot express. This one operation is what makes concurrent
   * last-seat requests race-safe: MongoDB serializes concurrent writes to
   * the same document, so only one of two simultaneous callers can ever
   * observe a matching filter and apply the `$inc` — the loser gets `null`
   * back, not a corrupted count. Always called from inside
   * `withTransaction` alongside the owning enrollment write, so a
   * downstream failure rolls the reservation back too. `Batch.status` is
   * intentionally not filtered here — call-site readiness/status checks
   * happen before this is invoked (`enrollment-capacity.service.ts`).
   */
  async reserveSeat(batchId: string, session: ClientSession): Promise<BatchDocument | null> {
    return BatchModel.findOneAndUpdate(
      { _id: batchId, isDeleted: false, $expr: { $lt: ['$occupiedSeats', '$maxStudents'] } },
      { $inc: { occupiedSeats: 1 } },
      { new: true, session },
    )
  },

  /** Atomic decrement, floored at 0 via the filter (never goes negative even if called out of turn). */
  async releaseSeat(batchId: string, session: ClientSession): Promise<BatchDocument | null> {
    return BatchModel.findOneAndUpdate(
      { _id: batchId, isDeleted: false, occupiedSeats: { $gt: 0 } },
      { $inc: { occupiedSeats: -1 } },
      { new: true, session },
    )
  },

  /** Monotonic per-batch waitlist sequence — never renumbered, never reused, so a queue position is stable even as earlier entries are promoted/cancelled. */
  async nextWaitlistPosition(batchId: string, session: ClientSession): Promise<number | null> {
    const updated = await BatchModel.findOneAndUpdate(
      { _id: batchId, isDeleted: false },
      { $inc: { waitlistSequence: 1 } },
      { new: true, session },
    )
    return updated?.waitlistSequence ?? null
  },

  /** Maintenance-only — directly overwrites `occupiedSeats` to the enrollment-derived truth. Never called from a normal request path (`enrollment-capacity.service.ts#reconcileBatchOccupiedSeats`). */
  async setOccupiedSeats(batchId: string, occupiedSeats: number): Promise<BatchDocument | null> {
    return BatchModel.findOneAndUpdate(
      { _id: batchId, isDeleted: false },
      { $set: { occupiedSeats } },
      { new: true },
    )
  },

  /** Phase 10B course-delete-protection guard — any batch for this course still in an operationally-live status (i.e. not `CANCELLED`/`ARCHIVED`). */
  async existsNonArchivedForCourse(courseId: string): Promise<boolean> {
    return Boolean(
      await BatchModel.exists({
        courseId,
        isDeleted: false,
        status: { $nin: ['CANCELLED', 'ARCHIVED'] },
      }),
    )
  },
}
