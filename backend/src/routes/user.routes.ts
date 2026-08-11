import { Router } from 'express'

import * as userController from '../controllers/user.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  assignRoleSchema,
  bulkActionSchema,
  createUserSchema,
  exportUsersQuerySchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  updateUserSchema,
  userIdParamSchema,
  userSessionParamSchema,
} from '../validators/user.validator'

export const userRouter = Router()

/**
 * `/users` has no public routes at all (unlike `/auth`) — protect the whole
 * router once here rather than per-route (API-STANDARDS.md §6).
 */
userRouter.use(requireAuth)

const READ = requirePermission('users:read')
const MANAGE = requirePermission('users:manage')
/**
 * DATABASE.md §3.1: viewing/revoking another user's sessions and reading
 * the audit trail are explicitly SUPER_ADMIN-only — stricter than the
 * general `users:manage`/`users:read` permissions ADMIN also holds.
 */
const SUPER_ADMIN_ONLY = requireRole('SUPER_ADMIN')

// Order matters: `/export` must be registered before the `/:id` param route.
userRouter.get(
  '/export',
  READ,
  validate({ query: exportUsersQuerySchema }),
  asyncHandler(userController.exportUsers),
)
userRouter.get(
  '/',
  READ,
  validate({ query: listUsersQuerySchema }),
  asyncHandler(userController.listUsers),
)
userRouter.post(
  '/',
  MANAGE,
  validate({ body: createUserSchema }),
  asyncHandler(userController.createUser),
)
userRouter.post(
  '/bulk',
  MANAGE,
  validate({ body: bulkActionSchema }),
  asyncHandler(userController.bulkAction),
)

userRouter.get(
  '/:id',
  READ,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.getUser),
)
userRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  asyncHandler(userController.updateUser),
)
userRouter.delete(
  '/:id',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.softDeleteUser),
)
userRouter.post(
  '/:id/restore',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.restoreUser),
)
userRouter.post(
  '/:id/activate',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.activateUser),
)
userRouter.post(
  '/:id/deactivate',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.deactivateUser),
)
userRouter.patch(
  '/:id/role',
  MANAGE,
  validate({ params: userIdParamSchema, body: assignRoleSchema }),
  asyncHandler(userController.assignRole),
)
userRouter.post(
  '/:id/reset-password',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.triggerPasswordReset),
)
userRouter.post(
  '/:id/resend-verification',
  MANAGE,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.resendVerification),
)

userRouter.get(
  '/:id/sessions',
  SUPER_ADMIN_ONLY,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.listUserSessions),
)
userRouter.delete(
  '/:id/sessions/:sessionId',
  SUPER_ADMIN_ONLY,
  validate({ params: userSessionParamSchema }),
  asyncHandler(userController.forceLogoutSession),
)
userRouter.post(
  '/:id/logout-all',
  SUPER_ADMIN_ONLY,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.forceLogoutAll),
)

userRouter.get(
  '/:id/audit-log',
  SUPER_ADMIN_ONLY,
  validate({ params: userIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(userController.getAuditTimeline),
)
