import { Router } from 'express'

import * as attendanceController from '../controllers/attendance.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  exportAttendanceQuerySchema,
  listAttendanceQuerySchema,
} from '../validators/attendance.validator'

/** The cross-session attendance report — session-scoped roster/bulk-mark/finalize/reopen actions live on `live-class.routes.ts` instead, since they operate on one session's sub-resource. */
export const attendanceRouter = Router()

attendanceRouter.use(requireAuth)

const READ = requirePermission('attendance:read')
const EXPORT = requirePermission('attendance:export')

// Order matters: `/export` must be registered before any future `/:id` param route.
attendanceRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportAttendanceQuerySchema }),
  asyncHandler(attendanceController.exportAttendance),
)
attendanceRouter.get(
  '/',
  READ,
  validate({ query: listAttendanceQuerySchema }),
  asyncHandler(attendanceController.listAttendance),
)
