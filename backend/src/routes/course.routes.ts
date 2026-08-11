import { Router } from 'express'

import * as courseController from '../controllers/course.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  confirmMediaSchema,
  courseBulkActionSchema,
  courseIdParamSchema,
  createCourseSchema,
  exportCoursesQuerySchema,
  listCoursesQuerySchema,
  paginationQuerySchema,
  updateCourseSchema,
} from '../validators/course.validator'

export const courseRouter = Router()

/** No public routes — protect once, matching `/students`/`/trainers` (API-STANDARDS.md §6). */
courseRouter.use(requireAuth)

const READ = requirePermission('courses:read')
const MANAGE = requirePermission('courses:manage')
const PUBLISH = requirePermission('courses:publish')
const EXPORT = requirePermission('courses:export')

// Order matters: `/export` and `/bulk/*` must be registered before the `/:id` param route.
courseRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportCoursesQuerySchema }),
  asyncHandler(courseController.exportCourses),
)
courseRouter.post(
  '/bulk/publish',
  PUBLISH,
  validate({ body: courseBulkActionSchema }),
  asyncHandler(courseController.bulkAction),
)
courseRouter.post(
  '/bulk/archive',
  MANAGE,
  validate({ body: courseBulkActionSchema }),
  asyncHandler(courseController.bulkAction),
)
courseRouter.post(
  '/bulk/restore',
  MANAGE,
  validate({ body: courseBulkActionSchema }),
  asyncHandler(courseController.bulkAction),
)
courseRouter.post(
  '/bulk/delete',
  MANAGE,
  validate({ body: courseBulkActionSchema }),
  asyncHandler(courseController.bulkAction),
)

courseRouter.get(
  '/',
  READ,
  validate({ query: listCoursesQuerySchema }),
  asyncHandler(courseController.listCourses),
)
courseRouter.post(
  '/',
  MANAGE,
  validate({ body: createCourseSchema }),
  asyncHandler(courseController.createCourse),
)

courseRouter.get(
  '/:id',
  READ,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.getCourse),
)
courseRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: courseIdParamSchema, body: updateCourseSchema }),
  asyncHandler(courseController.updateCourse),
)
courseRouter.delete(
  '/:id',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.softDeleteCourse),
)

courseRouter.post(
  '/:id/readiness-check',
  READ,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.checkReadiness),
)
courseRouter.post(
  '/:id/publish',
  PUBLISH,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.publishCourse),
)
courseRouter.post(
  '/:id/unpublish',
  PUBLISH,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.unpublishCourse),
)
courseRouter.post(
  '/:id/archive',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.archiveCourse),
)
courseRouter.post(
  '/:id/restore',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.restoreCourse),
)

courseRouter.get(
  '/:id/audit',
  MANAGE,
  validate({ params: courseIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(courseController.getAuditTimeline),
)

courseRouter.post(
  '/:id/thumbnail/signature',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.getThumbnailUploadSignature),
)
courseRouter.post(
  '/:id/thumbnail/verify',
  MANAGE,
  validate({ params: courseIdParamSchema, body: confirmMediaSchema }),
  asyncHandler(courseController.verifyThumbnail),
)
courseRouter.delete(
  '/:id/thumbnail',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.removeThumbnail),
)

courseRouter.post(
  '/:id/banner/signature',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.getBannerUploadSignature),
)
courseRouter.post(
  '/:id/banner/verify',
  MANAGE,
  validate({ params: courseIdParamSchema, body: confirmMediaSchema }),
  asyncHandler(courseController.verifyBanner),
)
courseRouter.delete(
  '/:id/banner',
  MANAGE,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseController.removeBanner),
)
