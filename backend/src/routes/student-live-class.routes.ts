import { Router } from 'express'

import * as studentLiveClassController from '../controllers/student-live-class.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { studentSessionIdParamSchema } from '../validators/student-live-class.validator'

/** Mounted at the same `/api/v1/student` prefix as `student-portal.routes.ts`/`student-learning.routes.ts` — same multi-router-one-prefix precedent, same `requireRole('STUDENT')`-only gate (no permission-catalog entries apply to self-scoped routes). */
export const studentLiveClassRouter = Router()

studentLiveClassRouter.use(requireAuth, requireRole('STUDENT'))

studentLiveClassRouter.get(
  '/live-classes',
  asyncHandler(studentLiveClassController.listLiveClasses),
)
studentLiveClassRouter.get(
  '/live-classes/:id',
  validate({ params: studentSessionIdParamSchema }),
  asyncHandler(studentLiveClassController.getLiveClass),
)
studentLiveClassRouter.get(
  '/live-classes/:id/join',
  validate({ params: studentSessionIdParamSchema }),
  asyncHandler(studentLiveClassController.getJoinDetails),
)

studentLiveClassRouter.get(
  '/attendance',
  asyncHandler(studentLiveClassController.getAttendanceOverview),
)
