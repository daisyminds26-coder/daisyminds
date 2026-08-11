import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { trainerManagementService } from '../services/trainer-management.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  ConfirmPhotoInput,
  CreateTrainerInput,
  ExportTrainersQuery,
  ListTrainersQuery,
  PaginationQuery,
  TrainerBulkActionInput,
  TrainerIdParam,
  TrainerSessionParam,
  UpdateTrainerInput,
} from '../validators/trainer.validator'

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

export async function listTrainers(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListTrainersQuery
  const { dtos, total } = await trainerManagementService.listTrainers(
    {
      status: query.status,
      employmentStatus: query.employmentStatus,
      employmentType: query.employmentType,
      department: query.department,
      designation: query.designation,
      expertise: query.expertise,
      technology: query.technology,
      availabilityStatus: query.availabilityStatus,
      profileCompletionStatus: query.profileCompletionStatus,
      city: query.city,
      state: query.state,
      tag: query.tag,
      joiningDateFrom: query.joiningDateFrom,
      joiningDateTo: query.joiningDateTo,
      minExperience: query.minExperience,
      maxExperience: query.maxExperience,
      search: query.search,
      includeDeleted: query.includeDeleted,
    },
    {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    },
  )

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

export async function exportTrainers(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const query = req.validated?.query as ExportTrainersQuery
  const csv = await trainerManagementService.exportTrainersCsv(
    {
      status: query.status,
      employmentStatus: query.employmentStatus,
      employmentType: query.employmentType,
      department: query.department,
      designation: query.designation,
      expertise: query.expertise,
      technology: query.technology,
      availabilityStatus: query.availabilityStatus,
      profileCompletionStatus: query.profileCompletionStatus,
      city: query.city,
      state: query.state,
      tag: query.tag,
      joiningDateFrom: query.joiningDateFrom,
      joiningDateTo: query.joiningDateTo,
      minExperience: query.minExperience,
      maxExperience: query.maxExperience,
      search: query.search,
      includeDeleted: query.includeDeleted,
    },
    actor,
    getRequestContext(req),
  )

  res.status(200).type('text/csv').attachment('trainers-export.csv').send(csv)
}

export async function getTrainer(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as TrainerIdParam
  const dto = await trainerManagementService.getTrainerById(id)
  sendSuccess(res, { data: dto })
}

export async function createTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateTrainerInput
  const dto = await trainerManagementService.createTrainer(input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Trainer created', data: dto })
}

export async function updateTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const input = req.validated?.body as UpdateTrainerInput
  const dto = await trainerManagementService.updateTrainer(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainer updated', data: dto })
}

export async function activateTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const dto = await trainerManagementService.activateTrainer(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainer activated', data: dto })
}

export async function deactivateTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const dto = await trainerManagementService.deactivateTrainer(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainer deactivated', data: dto })
}

export async function softDeleteTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  await trainerManagementService.softDeleteTrainer(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainer deleted' })
}

export async function restoreTrainer(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const dto = await trainerManagementService.restoreTrainer(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Trainer restored', data: dto })
}

export async function resendInvitation(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  await trainerManagementService.resendInvitation(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Invitation email sent' })
}

export async function listTrainerSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as TrainerIdParam
  const sessions = await trainerManagementService.listSessions(id)
  sendSuccess(res, { data: sessions })
}

export async function forceLogoutSession(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, sessionId } = req.validated?.params as TrainerSessionParam
  await trainerManagementService.forceLogoutSession(id, sessionId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session revoked' })
}

export async function forceLogoutAll(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  await trainerManagementService.forceLogoutAll(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'All sessions revoked' })
}

export async function bulkAction(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { action, trainerIds } = req.validated?.body as TrainerBulkActionInput
  const result = await trainerManagementService.bulkAction(
    action,
    trainerIds,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Bulk action completed', data: result })
}

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as TrainerIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await trainerManagementService.getAuditTimeline(id, page, limit)

  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function getPhotoUploadSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as TrainerIdParam
  const params = await trainerManagementService.getPhotoUploadSignature(id)
  sendSuccess(res, { data: params })
}

export async function confirmPhoto(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const { publicId } = req.validated?.body as ConfirmPhotoInput
  const dto = await trainerManagementService.confirmPhoto(
    id,
    publicId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Profile photo updated', data: dto })
}

export async function removePhoto(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as TrainerIdParam
  const dto = await trainerManagementService.removePhoto(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Profile photo removed', data: dto })
}
