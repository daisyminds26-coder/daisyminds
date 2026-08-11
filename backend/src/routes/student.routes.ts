import { Router } from 'express'

import * as studentController from '../controllers/student.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  confirmPhotoSchema,
  createStudentSchema,
  exportStudentsQuerySchema,
  listStudentsQuerySchema,
  paginationQuerySchema,
  studentBulkActionSchema,
  studentIdParamSchema,
  studentSessionParamSchema,
  updateStudentSchema,
} from '../validators/student.validator'

export const studentRouter = Router()

/** No public routes on this router at all — protect it once, matching `/users` (API-STANDARDS.md §6). */
studentRouter.use(requireAuth)

const READ = requirePermission('students:read')
const MANAGE = requirePermission('students:manage')
/** A distinct catalog entry from `students:read` per the phase spec's own permission list — bulk data extraction is a deliberately separable grant. */
const EXPORT = requirePermission('students:export')
/**
 * Mirrors `/users`' SUPER_ADMIN-only carve-out for sessions/audit exactly
 * (DATABASE.md §3.1 / ARCHITECTURE.md's Student Management notes) — the
 * Phase 6 spec's own role matrix omits "view sessions"/"view audit
 * timeline" from ADMIN's allowed actions entirely, so this is the same
 * stricter-than-`students:manage` gate, not a new pattern.
 */
const SUPER_ADMIN_ONLY = requireRole('SUPER_ADMIN')

// Order matters: `/export` must be registered before the `/:id` param route.
studentRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportStudentsQuerySchema }),
  asyncHandler(studentController.exportStudents),
)
studentRouter.get(
  '/',
  READ,
  validate({ query: listStudentsQuerySchema }),
  asyncHandler(studentController.listStudents),
)
studentRouter.post(
  '/',
  MANAGE,
  validate({ body: createStudentSchema }),
  asyncHandler(studentController.createStudent),
)
studentRouter.post(
  '/bulk',
  MANAGE,
  validate({ body: studentBulkActionSchema }),
  asyncHandler(studentController.bulkAction),
)

studentRouter.get(
  '/:id',
  READ,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.getStudent),
)
studentRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: studentIdParamSchema, body: updateStudentSchema }),
  asyncHandler(studentController.updateStudent),
)
studentRouter.delete(
  '/:id',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.softDeleteStudent),
)
studentRouter.post(
  '/:id/restore',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.restoreStudent),
)
studentRouter.post(
  '/:id/activate',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.activateStudent),
)
studentRouter.post(
  '/:id/deactivate',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.deactivateStudent),
)
studentRouter.post(
  '/:id/resend-invitation',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.resendInvitation),
)

studentRouter.get(
  '/:id/sessions',
  SUPER_ADMIN_ONLY,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.listStudentSessions),
)
studentRouter.delete(
  '/:id/sessions/:sessionId',
  SUPER_ADMIN_ONLY,
  validate({ params: studentSessionParamSchema }),
  asyncHandler(studentController.forceLogoutSession),
)
studentRouter.post(
  '/:id/logout-all',
  SUPER_ADMIN_ONLY,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.forceLogoutAll),
)

studentRouter.get(
  '/:id/audit-log',
  SUPER_ADMIN_ONLY,
  validate({ params: studentIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(studentController.getAuditTimeline),
)

studentRouter.post(
  '/:id/photo/signature',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.getPhotoUploadSignature),
)
studentRouter.patch(
  '/:id/photo',
  MANAGE,
  validate({ params: studentIdParamSchema, body: confirmPhotoSchema }),
  asyncHandler(studentController.confirmPhoto),
)
studentRouter.delete(
  '/:id/photo',
  MANAGE,
  validate({ params: studentIdParamSchema }),
  asyncHandler(studentController.removePhoto),
)
