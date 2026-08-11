import { Router } from 'express'

import * as dashboardController from '../controllers/dashboard.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { adminDashboardQuerySchema } from '../validators/dashboard.validator'

export const dashboardRouter = Router()

/** No public routes — protect once, matching `/users`/`/students`/`/trainers` (API-STANDARDS.md §6). */
dashboardRouter.use(requireAuth)

dashboardRouter.get(
  '/admin',
  requirePermission('dashboard:read'),
  validate({ query: adminDashboardQuerySchema }),
  asyncHandler(dashboardController.getAdminDashboard),
)
