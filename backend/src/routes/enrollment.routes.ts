import { Router } from 'express'

import * as enrollmentController from '../controllers/enrollment.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  bulkEnrollSchema,
  bulkLifecycleActionSchema,
  cancelEnrollmentSchema,
  createEnrollmentSchema,
  dropEnrollmentSchema,
  enrollmentIdParamSchema,
  exportEnrollmentsQuerySchema,
  listEnrollmentsQuerySchema,
  paginationQuerySchema,
  transferEnrollmentSchema,
} from '../validators/enrollment.validator'

export const enrollmentRouter = Router()

/** No public routes — protect once, matching `/batches`/`/courses` (API-STANDARDS.md §6). */
enrollmentRouter.use(requireAuth)

const READ = requirePermission('enrollments:read')
const MANAGE = requirePermission('enrollments:manage')
const EXPORT = requirePermission('enrollments:export')

// Order matters: `/export` and `/bulk/*` must be registered before the `/:id` param route.
enrollmentRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportEnrollmentsQuerySchema }),
  asyncHandler(enrollmentController.exportEnrollments),
)
enrollmentRouter.post(
  '/bulk/enroll',
  MANAGE,
  validate({ body: bulkEnrollSchema }),
  asyncHandler(enrollmentController.bulkEnroll),
)
enrollmentRouter.post(
  '/bulk/suspend',
  MANAGE,
  validate({ body: bulkLifecycleActionSchema }),
  asyncHandler(enrollmentController.bulkSuspend),
)
enrollmentRouter.post(
  '/bulk/resume',
  MANAGE,
  validate({ body: bulkLifecycleActionSchema }),
  asyncHandler(enrollmentController.bulkResume),
)
enrollmentRouter.post(
  '/bulk/cancel',
  MANAGE,
  validate({ body: bulkLifecycleActionSchema }),
  asyncHandler(enrollmentController.bulkCancel),
)

enrollmentRouter.get(
  '/',
  READ,
  validate({ query: listEnrollmentsQuerySchema }),
  asyncHandler(enrollmentController.listEnrollments),
)
enrollmentRouter.post(
  '/',
  MANAGE,
  validate({ body: createEnrollmentSchema }),
  asyncHandler(enrollmentController.createEnrollment),
)

enrollmentRouter.get(
  '/:id',
  READ,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.getEnrollment),
)

enrollmentRouter.post(
  '/:id/confirm',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.confirmEnrollment),
)
enrollmentRouter.post(
  '/:id/promote-waitlist',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.promoteWaitlist),
)
enrollmentRouter.post(
  '/:id/activate',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.activateEnrollment),
)
enrollmentRouter.post(
  '/:id/suspend',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.suspendEnrollment),
)
enrollmentRouter.post(
  '/:id/resume',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.resumeEnrollment),
)
enrollmentRouter.post(
  '/:id/complete',
  MANAGE,
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(enrollmentController.completeEnrollment),
)
enrollmentRouter.post(
  '/:id/cancel',
  MANAGE,
  validate({ params: enrollmentIdParamSchema, body: cancelEnrollmentSchema }),
  asyncHandler(enrollmentController.cancelEnrollment),
)
enrollmentRouter.post(
  '/:id/drop',
  MANAGE,
  validate({ params: enrollmentIdParamSchema, body: dropEnrollmentSchema }),
  asyncHandler(enrollmentController.dropEnrollment),
)
enrollmentRouter.post(
  '/:id/transfer',
  MANAGE,
  validate({ params: enrollmentIdParamSchema, body: transferEnrollmentSchema }),
  asyncHandler(enrollmentController.transferEnrollment),
)

enrollmentRouter.get(
  '/:id/audit',
  MANAGE,
  validate({ params: enrollmentIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(enrollmentController.getAuditTimeline),
)
