import { Router } from 'express'

import * as trainerLiveClassController from '../controllers/trainer-live-class.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  trainerListLiveClassesQuerySchema,
  trainerMarkAttendanceSchema,
  trainerSessionIdParamSchema,
} from '../validators/trainer-live-class.validator'

/**
 * The first `/api/v1/trainer/*` namespace in this codebase — self-scoped,
 * ownership-checked (never a broad admin permission: `TRAINER` carries only
 * `users:read` in the permission catalog, task's own explicit instruction
 * that trainer self-service relies on role + ownership, not new admin-style
 * permissions). Every route resolves the acting trainer from `req.user.id`
 * via `trainerRepository.findByUserId` — never a client-supplied
 * `trainerId` — and every session lookup is ownership-checked
 * (`primaryTrainerId`/`trainerIds` membership) before any data is returned.
 */
export const trainerLiveClassRouter = Router()

trainerLiveClassRouter.use(requireAuth, requireRole('TRAINER'))

trainerLiveClassRouter.get(
  '/live-classes',
  validate({ query: trainerListLiveClassesQuerySchema }),
  asyncHandler(trainerLiveClassController.listMySessions),
)
trainerLiveClassRouter.get(
  '/live-classes/:id',
  validate({ params: trainerSessionIdParamSchema }),
  asyncHandler(trainerLiveClassController.getMySession),
)
trainerLiveClassRouter.post(
  '/live-classes/:id/start',
  validate({ params: trainerSessionIdParamSchema }),
  asyncHandler(trainerLiveClassController.startMySession),
)
trainerLiveClassRouter.post(
  '/live-classes/:id/complete',
  validate({ params: trainerSessionIdParamSchema }),
  asyncHandler(trainerLiveClassController.completeMySession),
)
trainerLiveClassRouter.get(
  '/live-classes/:id/attendance',
  validate({ params: trainerSessionIdParamSchema }),
  asyncHandler(trainerLiveClassController.getMySessionAttendance),
)
trainerLiveClassRouter.patch(
  '/live-classes/:id/attendance',
  validate({ params: trainerSessionIdParamSchema, body: trainerMarkAttendanceSchema }),
  asyncHandler(trainerLiveClassController.markMySessionAttendance),
)
