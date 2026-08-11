import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { userManagementService, type RequestContext } from '../services/user-management.service'
import type {
  AssignRoleInput,
  BulkActionInput,
  CreateUserInput,
  ExportUsersQuery,
  ListUsersQuery,
  PaginationQuery,
  UpdateUserInput,
  UserIdParam,
  UserSessionParam,
} from '../validators/user.validator'

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

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListUsersQuery
  const { dtos, total } = await userManagementService.listUsers(query)

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

export async function exportUsers(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ExportUsersQuery
  const csv = await userManagementService.exportUsersCsv({
    status: query.status,
    roleId: query.roleId,
    search: query.search,
    includeDeleted: query.includeDeleted,
  })

  res.status(200).type('text/csv').attachment('users-export.csv').send(csv)
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as UserIdParam
  const dto = await userManagementService.getUserById(id)
  sendSuccess(res, { data: dto })
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateUserInput
  const dto = await userManagementService.createUser(input, actor, getRequestContext(req))
  sendCreated(res, { message: 'User created', data: dto })
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  const input = req.validated?.body as UpdateUserInput
  const dto = await userManagementService.updateUser(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'User updated', data: dto })
}

export async function activateUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  const dto = await userManagementService.activateUser(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'User activated', data: dto })
}

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  const dto = await userManagementService.deactivateUser(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'User deactivated', data: dto })
}

export async function softDeleteUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  await userManagementService.softDeleteUser(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'User deleted' })
}

export async function restoreUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  const dto = await userManagementService.restoreUser(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'User restored', data: dto })
}

export async function assignRole(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  const { roleId } = req.validated?.body as AssignRoleInput
  const dto = await userManagementService.assignRole(id, roleId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Role assigned', data: dto })
}

export async function triggerPasswordReset(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  await userManagementService.triggerPasswordReset(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Password reset email sent' })
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  await userManagementService.resendVerification(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Verification email sent' })
}

export async function listUserSessions(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as UserIdParam
  const sessions = await userManagementService.listSessions(id)
  sendSuccess(res, { data: sessions })
}

export async function forceLogoutSession(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, sessionId } = req.validated?.params as UserSessionParam
  await userManagementService.forceLogoutSession(id, sessionId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session revoked' })
}

export async function forceLogoutAll(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as UserIdParam
  await userManagementService.forceLogoutAll(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'All sessions revoked' })
}

export async function bulkAction(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { action, userIds } = req.validated?.body as BulkActionInput
  const result = await userManagementService.bulkAction(
    action,
    userIds,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Bulk action completed', data: result })
}

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as UserIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await userManagementService.getAuditTimeline(id, page, limit)

  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
