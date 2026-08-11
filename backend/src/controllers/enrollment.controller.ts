import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { enrollmentManagementService } from '../services/enrollment-management.service'
import { enrollmentTransferService } from '../services/enrollment-transfer.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  BulkEnrollInput,
  BulkLifecycleActionInput,
  CancelEnrollmentInput,
  CreateEnrollmentInput,
  DropEnrollmentInput,
  EnrollmentIdParam,
  ExportEnrollmentsQuery,
  ListEnrollmentsQuery,
  PaginationQuery,
  TransferEnrollmentInput,
} from '../validators/enrollment.validator'

function getRequestContext(req: Request): RequestContext {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized()
  return req.user
}

function listFilter(query: ListEnrollmentsQuery | ExportEnrollmentsQuery) {
  return {
    status: query.status,
    studentId: query.studentId,
    batchId: query.batchId,
    courseId: query.courseId,
    source: query.source,
    search: query.search,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
    includeDeleted: query.includeDeleted,
  }
}

export async function listEnrollments(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListEnrollmentsQuery
  const { dtos, total } = await enrollmentManagementService.listEnrollments(listFilter(query), {
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

export async function exportEnrollments(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const query = req.validated?.query as ExportEnrollmentsQuery
  const csv = await enrollmentManagementService.exportEnrollmentsCsv(
    listFilter(query),
    actor,
    getRequestContext(req),
  )
  res.status(200).type('text/csv').attachment('enrollments-export.csv').send(csv)
}

export async function getEnrollment(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.getEnrollmentById(id)
  sendSuccess(res, { data: dto })
}

export async function createEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateEnrollmentInput
  const dto = await enrollmentManagementService.createEnrollment(
    input,
    actor,
    getRequestContext(req),
  )
  sendCreated(res, { message: 'Enrollment created', data: dto })
}

export async function confirmEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.confirmEnrollment(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Enrollment confirmed', data: dto })
}

export async function promoteWaitlist(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.promoteWaitlist(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Enrollment promoted from waitlist', data: dto })
}

export async function activateEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.activateEnrollment(
    id,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Enrollment activated', data: dto })
}

export async function suspendEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.suspendEnrollment(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Enrollment suspended', data: dto })
}

export async function resumeEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.resumeEnrollment(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Enrollment resumed', data: dto })
}

export async function completeEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await enrollmentManagementService.completeEnrollment(
    id,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Enrollment completed', data: dto })
}

export async function cancelEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const { reason } = req.validated?.body as CancelEnrollmentInput
  const dto = await enrollmentManagementService.cancelEnrollment(
    id,
    reason,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Enrollment cancelled', data: dto })
}

export async function dropEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const { reason } = req.validated?.body as DropEnrollmentInput
  const dto = await enrollmentManagementService.dropEnrollment(
    id,
    reason,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Enrollment dropped', data: dto })
}

export async function transferEnrollment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const { targetBatchId, reason } = req.validated?.body as TransferEnrollmentInput
  const dto = await enrollmentTransferService.transferEnrollment(
    id,
    targetBatchId,
    reason,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Enrollment transferred', data: dto })
}

export async function bulkEnroll(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as BulkEnrollInput
  const result = await enrollmentManagementService.bulkEnroll(input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Bulk enrollment completed', data: result })
}

function bulkLifecycleHandler(action: 'suspend' | 'resume' | 'cancel') {
  return async (req: Request, res: Response): Promise<void> => {
    const actor = requireUser(req)
    const { enrollmentIds, reason } = req.validated?.body as BulkLifecycleActionInput
    const result = await enrollmentManagementService.bulkLifecycleAction(
      action,
      enrollmentIds,
      reason,
      actor,
      getRequestContext(req),
    )
    sendSuccess(res, { message: 'Bulk action completed', data: result })
  }
}

export const bulkSuspend = bulkLifecycleHandler('suspend')
export const bulkResume = bulkLifecycleHandler('resume')
export const bulkCancel = bulkLifecycleHandler('cancel')

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as EnrollmentIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await enrollmentManagementService.getAuditTimeline(id, page, limit)
  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
