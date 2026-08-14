import { Router } from 'express'

import * as liveClassController from '../controllers/live-class.controller'
import * as attendanceController from '../controllers/attendance.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  cancelLiveClassSchema,
  createLiveClassSchema,
  generateCreateSchema,
  generatePreviewSchema,
  liveClassIdParamSchema,
  listLiveClassesQuerySchema,
  updateLiveClassSchema,
} from '../validators/live-class.validator'
import {
  bulkMarkAttendanceSchema,
  reopenAttendanceSchema,
  sessionIdParamSchema,
} from '../validators/attendance.validator'

export const liveClassRouter = Router()

liveClassRouter.use(requireAuth)

const READ = requirePermission('live_classes:read')
const MANAGE = requirePermission('live_classes:manage')

// Order matters: `/generate/*` must be registered before the `/:id` param route.
liveClassRouter.post(
  '/generate/preview',
  READ,
  validate({ body: generatePreviewSchema }),
  asyncHandler(liveClassController.previewGeneration),
)
liveClassRouter.post(
  '/generate',
  MANAGE,
  validate({ body: generateCreateSchema }),
  asyncHandler(liveClassController.generateFromTimetable),
)

liveClassRouter.get(
  '/',
  READ,
  validate({ query: listLiveClassesQuerySchema }),
  asyncHandler(liveClassController.listLiveClasses),
)
liveClassRouter.post(
  '/',
  MANAGE,
  validate({ body: createLiveClassSchema }),
  asyncHandler(liveClassController.createLiveClass),
)
liveClassRouter.get(
  '/:id',
  READ,
  validate({ params: liveClassIdParamSchema }),
  asyncHandler(liveClassController.getLiveClass),
)
liveClassRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: liveClassIdParamSchema, body: updateLiveClassSchema }),
  asyncHandler(liveClassController.updateLiveClass),
)

liveClassRouter.post(
  '/:id/schedule',
  MANAGE,
  validate({ params: liveClassIdParamSchema }),
  asyncHandler(liveClassController.scheduleLiveClass),
)
liveClassRouter.post(
  '/:id/start',
  MANAGE,
  validate({ params: liveClassIdParamSchema }),
  asyncHandler(liveClassController.startLiveClass),
)
liveClassRouter.post(
  '/:id/complete',
  MANAGE,
  validate({ params: liveClassIdParamSchema }),
  asyncHandler(liveClassController.completeLiveClass),
)
liveClassRouter.post(
  '/:id/cancel',
  MANAGE,
  validate({ params: liveClassIdParamSchema, body: cancelLiveClassSchema }),
  asyncHandler(liveClassController.cancelLiveClass),
)

// Session-scoped attendance sub-resource — a `live_classes:read`/`attendance:read`-and-`:manage` split, not folded into the session's own permissions, since attendance is its own permission-catalog entry (task's own explicit instruction).
const ATTENDANCE_READ = requirePermission('attendance:read')
const ATTENDANCE_MANAGE = requirePermission('attendance:manage')

liveClassRouter.get(
  '/:id/attendance',
  ATTENDANCE_READ,
  validate({ params: sessionIdParamSchema }),
  asyncHandler(attendanceController.getSessionAttendance),
)
liveClassRouter.patch(
  '/:id/attendance',
  ATTENDANCE_MANAGE,
  validate({ params: sessionIdParamSchema, body: bulkMarkAttendanceSchema }),
  asyncHandler(attendanceController.bulkMarkSessionAttendance),
)
liveClassRouter.post(
  '/:id/attendance/finalize',
  ATTENDANCE_MANAGE,
  validate({ params: sessionIdParamSchema }),
  asyncHandler(attendanceController.finalizeSessionAttendance),
)
liveClassRouter.post(
  '/:id/attendance/reopen',
  ATTENDANCE_MANAGE,
  validate({ params: sessionIdParamSchema, body: reopenAttendanceSchema }),
  asyncHandler(attendanceController.reopenSessionAttendance),
)
