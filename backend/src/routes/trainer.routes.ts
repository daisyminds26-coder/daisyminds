import { Router } from 'express'

import * as trainerController from '../controllers/trainer.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  confirmPhotoSchema,
  createTrainerSchema,
  exportTrainersQuerySchema,
  listTrainersQuerySchema,
  paginationQuerySchema,
  trainerBulkActionSchema,
  trainerIdParamSchema,
  trainerSessionParamSchema,
  updateTrainerSchema,
} from '../validators/trainer.validator'

export const trainerRouter = Router()

/** No public routes on this router at all — protect it once, matching `/users`/`/students` (API-STANDARDS.md §6). */
trainerRouter.use(requireAuth)

const READ = requirePermission('trainers:read')
const MANAGE = requirePermission('trainers:manage')
const EXPORT = requirePermission('trainers:export')
/**
 * Mirrors `/users`' and `/students`' SUPER_ADMIN-only carve-out for
 * sessions/audit exactly — the Phase 7 spec's own role matrix omits "view
 * sessions"/"view audit timeline" from ADMIN's allowed actions entirely, so
 * this is the same stricter-than-`trainers:manage` gate, not a new pattern.
 */
const SUPER_ADMIN_ONLY = requireRole('SUPER_ADMIN')

// Order matters: `/export` must be registered before the `/:id` param route.
trainerRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportTrainersQuerySchema }),
  asyncHandler(trainerController.exportTrainers),
)
trainerRouter.get(
  '/',
  READ,
  validate({ query: listTrainersQuerySchema }),
  asyncHandler(trainerController.listTrainers),
)
trainerRouter.post(
  '/',
  MANAGE,
  validate({ body: createTrainerSchema }),
  asyncHandler(trainerController.createTrainer),
)
trainerRouter.post(
  '/bulk',
  MANAGE,
  validate({ body: trainerBulkActionSchema }),
  asyncHandler(trainerController.bulkAction),
)

trainerRouter.get(
  '/:id',
  READ,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.getTrainer),
)
trainerRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: trainerIdParamSchema, body: updateTrainerSchema }),
  asyncHandler(trainerController.updateTrainer),
)
trainerRouter.delete(
  '/:id',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.softDeleteTrainer),
)
trainerRouter.post(
  '/:id/restore',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.restoreTrainer),
)
trainerRouter.post(
  '/:id/activate',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.activateTrainer),
)
trainerRouter.post(
  '/:id/deactivate',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.deactivateTrainer),
)
trainerRouter.post(
  '/:id/resend-invitation',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.resendInvitation),
)

trainerRouter.get(
  '/:id/sessions',
  SUPER_ADMIN_ONLY,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.listTrainerSessions),
)
trainerRouter.delete(
  '/:id/sessions/:sessionId',
  SUPER_ADMIN_ONLY,
  validate({ params: trainerSessionParamSchema }),
  asyncHandler(trainerController.forceLogoutSession),
)
trainerRouter.post(
  '/:id/logout-all',
  SUPER_ADMIN_ONLY,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.forceLogoutAll),
)

trainerRouter.get(
  '/:id/audit-log',
  SUPER_ADMIN_ONLY,
  validate({ params: trainerIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(trainerController.getAuditTimeline),
)

/**
 * `/photo/*`, not `/profile-photo/*` — matches the students module's
 * established naming exactly (API-STANDARDS.md: "do not introduce
 * inconsistent endpoint naming" takes precedence over this phase's own
 * suggested endpoint list where the two disagree).
 */
trainerRouter.post(
  '/:id/photo/signature',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.getPhotoUploadSignature),
)
trainerRouter.patch(
  '/:id/photo',
  MANAGE,
  validate({ params: trainerIdParamSchema, body: confirmPhotoSchema }),
  asyncHandler(trainerController.confirmPhoto),
)
trainerRouter.delete(
  '/:id/photo',
  MANAGE,
  validate({ params: trainerIdParamSchema }),
  asyncHandler(trainerController.removePhoto),
)
