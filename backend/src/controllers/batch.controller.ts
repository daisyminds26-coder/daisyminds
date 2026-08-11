import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { batchManagementService } from '../services/batch-management.service'
import { enrollmentCapacityService } from '../services/enrollment-capacity.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  AssignTrainersInput,
  BatchBulkActionInput,
  BatchIdParam,
  CalendarExceptionsBodyInput,
  CreateBatchInput,
  DuplicateBatchInput,
  ExportBatchesQuery,
  ListBatchesQuery,
  PaginationQuery,
  UpdateBatchInput,
  WeeklyScheduleBodyInput,
} from '../validators/batch.validator'

function getRequestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user
}

function listFilter(query: ListBatchesQuery | ExportBatchesQuery) {
  return {
    status: query.status,
    courseId: query.courseId,
    primaryTrainerId: query.primaryTrainerId,
    deliveryMode: query.deliveryMode,
    timezone: query.timezone,
    startDateFrom: query.startDateFrom,
    startDateTo: query.startDateTo,
    endDateFrom: query.endDateFrom,
    endDateTo: query.endDateTo,
    temporal: query.temporal,
    minCapacity: query.minCapacity,
    maxCapacity: query.maxCapacity,
    waitlistEnabled: query.waitlistEnabled,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
    search: query.search,
    includeDeleted: query.includeDeleted,
  }
}

export async function listBatches(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListBatchesQuery
  const { dtos, total } = await batchManagementService.listBatches(listFilter(query), {
    page: query.page,
    limit: query.limit,
    sortField: query.sort.field,
    sortDirection: query.sort.direction,
  })

  sendSuccess(res, {
    data: dtos,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  })
}

export async function exportBatches(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const query = req.validated?.query as ExportBatchesQuery
  const csv = await batchManagementService.exportBatchesCsv(
    listFilter(query),
    actor,
    getRequestContext(req),
  )

  res.status(200).type('text/csv').attachment('batches-export.csv').send(csv)
}

export async function getBatch(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.getBatchById(id)
  sendSuccess(res, { data: dto })
}

export async function createBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateBatchInput
  const dto = await batchManagementService.createBatch(input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Batch created', data: dto })
}

export async function updateBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const input = req.validated?.body as UpdateBatchInput
  const dto = await batchManagementService.updateBatch(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch updated', data: dto })
}

export async function checkReadiness(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const readiness = await batchManagementService.getReadiness(id)
  sendSuccess(res, { data: readiness })
}

export async function getConflicts(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const conflicts = await batchManagementService.getConflicts(id)
  sendSuccess(res, { data: conflicts })
}

export async function assignTrainers(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const input = req.validated?.body as AssignTrainersInput
  const dto = await batchManagementService.assignTrainers(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainers updated', data: dto })
}

export async function updateWeeklySchedule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const { weeklySchedule } = req.validated?.body as WeeklyScheduleBodyInput
  const dto = await batchManagementService.updateWeeklySchedule(
    id,
    weeklySchedule,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Weekly schedule updated', data: dto })
}

export async function updateCalendarExceptions(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const { calendarExceptions } = req.validated?.body as CalendarExceptionsBodyInput
  const dto = await batchManagementService.updateCalendarExceptions(
    id,
    calendarExceptions,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Calendar exceptions updated', data: dto })
}

export async function scheduleBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.scheduleBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch scheduled', data: dto })
}

export async function unscheduleBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.unscheduleBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch moved back to draft', data: dto })
}

export async function activateBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.activateBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch activated', data: dto })
}

export async function completeBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.completeBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch completed', data: dto })
}

export async function cancelBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.cancelBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch cancelled', data: dto })
}

export async function archiveBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.archiveBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch archived', data: dto })
}

export async function restoreBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const dto = await batchManagementService.restoreBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch restored', data: dto })
}

export async function softDeleteBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  await batchManagementService.softDeleteBatch(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Batch deleted' })
}

export async function duplicateBatch(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const input = req.validated?.body as DuplicateBatchInput
  const dto = await batchManagementService.duplicateBatch(id, input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Batch duplicated', data: dto })
}

export async function bulkAction(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { action, batchIds } = req.validated?.body as BatchBulkActionInput
  const result = await batchManagementService.bulkAction(
    action,
    batchIds,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Bulk action completed', data: result })
}

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await batchManagementService.getAuditTimeline(id, page, limit)

  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/** Phase 10B — server-managed derived capacity, never client-writable. */
export async function getBatchCapacity(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const snapshot = await enrollmentCapacityService.getCapacitySnapshot(id)
  sendSuccess(res, { data: snapshot })
}

export async function getBatchWaitlist(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as BatchIdParam
  const waitlist = await enrollmentCapacityService.getWaitlist(id)
  sendSuccess(res, { data: waitlist })
}

/** SUPER_ADMIN-only maintenance action — see `enrollment-capacity.service.ts#reconcileBatchOccupiedSeats`. */
export async function reconcileBatchCapacity(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as BatchIdParam
  const result = await enrollmentCapacityService.reconcileBatchOccupiedSeats(
    id,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Capacity reconciled', data: result })
}
