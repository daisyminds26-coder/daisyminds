import { Router } from 'express'

import * as studentAssignmentController from '../controllers/student-assignment.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  saveDraftSchema,
  studentAssignmentIdParamSchema,
  studentAttachmentIdParamSchema,
  studentFileIdParamSchema,
  submitAssignmentSchema,
  uploadFileSchema,
} from '../validators/student-assignment.validator'

/** Self-scoped `/api/v1/student/assignments/*` — mirrors the `requireRole('STUDENT')`-only gate every other student namespace (Phase 11A/11B/12) uses; `STUDENT` carries no permission-catalog entries by design. */
export const studentAssignmentRouter = Router()

studentAssignmentRouter.use(requireAuth, requireRole('STUDENT'))

studentAssignmentRouter.get(
  '/assignments',
  asyncHandler(studentAssignmentController.listMyAssignments),
)
studentAssignmentRouter.get(
  '/assignments/:id',
  validate({ params: studentAssignmentIdParamSchema }),
  asyncHandler(studentAssignmentController.getMyAssignment),
)
studentAssignmentRouter.get(
  '/assignments/:id/history',
  validate({ params: studentAssignmentIdParamSchema }),
  asyncHandler(studentAssignmentController.getMyAttemptHistory),
)

studentAssignmentRouter.post(
  '/assignments/:id/submissions/draft',
  validate({ params: studentAssignmentIdParamSchema, body: saveDraftSchema }),
  asyncHandler(studentAssignmentController.saveDraft),
)
studentAssignmentRouter.post(
  '/assignments/:id/submissions/submit',
  validate({ params: studentAssignmentIdParamSchema, body: submitAssignmentSchema }),
  asyncHandler(studentAssignmentController.submitAssignment),
)

studentAssignmentRouter.post(
  '/assignments/:id/submissions/files/signature',
  validate({ params: studentAssignmentIdParamSchema }),
  asyncHandler(studentAssignmentController.getFileUploadSignature),
)
studentAssignmentRouter.post(
  '/assignments/:id/submissions/files',
  validate({ params: studentAssignmentIdParamSchema, body: uploadFileSchema }),
  asyncHandler(studentAssignmentController.confirmFile),
)
studentAssignmentRouter.delete(
  '/assignments/:id/submissions/files/:fileId',
  validate({ params: studentFileIdParamSchema }),
  asyncHandler(studentAssignmentController.removeFile),
)
studentAssignmentRouter.get(
  '/assignments/:id/submissions/files/:fileId/delivery-url',
  validate({ params: studentFileIdParamSchema }),
  asyncHandler(studentAssignmentController.getSubmissionFileDeliveryUrl),
)

studentAssignmentRouter.get(
  '/assignments/:id/attachments/:attachmentId/delivery-url',
  validate({ params: studentAttachmentIdParamSchema }),
  asyncHandler(studentAssignmentController.getAssignmentAttachmentDeliveryUrl),
)
