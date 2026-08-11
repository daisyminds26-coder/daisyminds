import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { studentManagementService } from '../services/student-management.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  ConfirmPhotoInput,
  CreateStudentInput,
  ExportStudentsQuery,
  ListStudentsQuery,
  PaginationQuery,
  StudentBulkActionInput,
  StudentIdParam,
  StudentSessionParam,
  UpdateStudentInput,
} from '../validators/student.validator'

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

export async function listStudents(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListStudentsQuery
  const { dtos, total } = await studentManagementService.listStudents(
    {
      status: query.status,
      gender: query.gender,
      state: query.state,
      city: query.city,
      source: query.source,
      tag: query.tag,
      profileCompletionStatus: query.profileCompletionStatus,
      admissionDateFrom: query.admissionDateFrom,
      admissionDateTo: query.admissionDateTo,
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

export async function exportStudents(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const query = req.validated?.query as ExportStudentsQuery
  const csv = await studentManagementService.exportStudentsCsv(
    {
      status: query.status,
      gender: query.gender,
      state: query.state,
      city: query.city,
      source: query.source,
      tag: query.tag,
      profileCompletionStatus: query.profileCompletionStatus,
      admissionDateFrom: query.admissionDateFrom,
      admissionDateTo: query.admissionDateTo,
      search: query.search,
      includeDeleted: query.includeDeleted,
    },
    actor,
    getRequestContext(req),
  )

  res.status(200).type('text/csv').attachment('students-export.csv').send(csv)
}

export async function getStudent(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as StudentIdParam
  const dto = await studentManagementService.getStudentById(id)
  sendSuccess(res, { data: dto })
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateStudentInput
  const dto = await studentManagementService.createStudent(input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Student created', data: dto })
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const input = req.validated?.body as UpdateStudentInput
  const dto = await studentManagementService.updateStudent(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Student updated', data: dto })
}

export async function activateStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const dto = await studentManagementService.activateStudent(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Student activated', data: dto })
}

export async function deactivateStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const dto = await studentManagementService.deactivateStudent(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Student deactivated', data: dto })
}

export async function softDeleteStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  await studentManagementService.softDeleteStudent(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Student deleted' })
}

export async function restoreStudent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const dto = await studentManagementService.restoreStudent(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Student restored', data: dto })
}

export async function resendInvitation(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  await studentManagementService.resendInvitation(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Invitation email sent' })
}

export async function listStudentSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as StudentIdParam
  const sessions = await studentManagementService.listSessions(id)
  sendSuccess(res, { data: sessions })
}

export async function forceLogoutSession(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, sessionId } = req.validated?.params as StudentSessionParam
  await studentManagementService.forceLogoutSession(id, sessionId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session revoked' })
}

export async function forceLogoutAll(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  await studentManagementService.forceLogoutAll(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'All sessions revoked' })
}

export async function bulkAction(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { action, studentIds } = req.validated?.body as StudentBulkActionInput
  const result = await studentManagementService.bulkAction(
    action,
    studentIds,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Bulk action completed', data: result })
}

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as StudentIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await studentManagementService.getAuditTimeline(id, page, limit)

  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function getPhotoUploadSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as StudentIdParam
  const params = await studentManagementService.getPhotoUploadSignature(id)
  sendSuccess(res, { data: params })
}

export async function confirmPhoto(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const { publicId } = req.validated?.body as ConfirmPhotoInput
  const dto = await studentManagementService.confirmPhoto(
    id,
    publicId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Profile photo updated', data: dto })
}

export async function removePhoto(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentIdParam
  const dto = await studentManagementService.removePhoto(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Profile photo removed', data: dto })
}
