import { Router } from 'express'

import * as studentPortalController from '../controllers/student-portal.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  courseIdParamSchema,
  enrollmentIdParamSchema,
  resourceIdParamSchema,
  updateOwnProfileSchema,
} from '../validators/student-portal.validator'

/**
 * Self-scoped student API (Phase 11A) — every route resolves the acting
 * student from `req.user.id` server-side (never a client-supplied
 * `studentId`/`?studentId=`). `STUDENT` carries zero entries in the
 * permission catalog by design (`scripts/seed-roles.ts`), so this router
 * gates on role alone, matching `GET /auth/me`'s precedent — there is
 * nothing in the permission table for a self-scoped route to check.
 */
export const studentPortalRouter = Router()

studentPortalRouter.use(requireAuth, requireRole('STUDENT'))

studentPortalRouter.get('/dashboard', asyncHandler(studentPortalController.getDashboard))

studentPortalRouter.get('/enrollments', asyncHandler(studentPortalController.listEnrollments))
studentPortalRouter.get(
  '/enrollments/:id',
  validate({ params: enrollmentIdParamSchema }),
  asyncHandler(studentPortalController.getEnrollment),
)

studentPortalRouter.get('/courses', asyncHandler(studentPortalController.listCourses))
studentPortalRouter.get(
  '/courses/:courseId',
  validate({ params: courseIdParamSchema }),
  asyncHandler(studentPortalController.getCourseOverview),
)

studentPortalRouter.get('/schedule', asyncHandler(studentPortalController.listSchedule))

studentPortalRouter.get('/resources', asyncHandler(studentPortalController.listResources))
studentPortalRouter.get(
  '/resources/:resourceId/delivery-url',
  validate({ params: resourceIdParamSchema }),
  asyncHandler(studentPortalController.getResourceDeliveryUrl),
)

studentPortalRouter.get('/profile', asyncHandler(studentPortalController.getProfile))
studentPortalRouter.patch(
  '/profile',
  validate({ body: updateOwnProfileSchema }),
  asyncHandler(studentPortalController.updateProfile),
)
