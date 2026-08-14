import { Router } from 'express'

import * as assignmentController from '../controllers/assignment.controller'
import * as submissionController from '../controllers/assignment-submission.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  assignmentIdParamSchema,
  attachmentIdParamSchema,
  cancelAssignmentSchema,
  confirmAttachmentSchema,
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  updateAssignmentSchema,
} from '../validators/assignment.validator'
import {
  assignmentStudentParamSchema,
  assignmentSubmissionsParamSchema,
  exportSubmissionsQuerySchema,
  gradeSubmissionSchema,
  listSubmissionsQuerySchema,
  returnSubmissionSchema,
  submissionIdParamSchema,
} from '../validators/assignment-submission.validator'

export const assignmentRouter = Router()

assignmentRouter.use(requireAuth)

const READ = requirePermission('assignments:read')
const MANAGE = requirePermission('assignments:manage')
const GRADE = requirePermission('assignments:grade')
const EXPORT = requirePermission('assignments:export')

// Order matters: `/export` must be registered before the `/:id` param route.
assignmentRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportSubmissionsQuerySchema }),
  asyncHandler(submissionController.exportSubmissions),
)

assignmentRouter.get(
  '/',
  READ,
  validate({ query: listAssignmentsQuerySchema }),
  asyncHandler(assignmentController.listAssignments),
)
assignmentRouter.post(
  '/',
  MANAGE,
  validate({ body: createAssignmentSchema }),
  asyncHandler(assignmentController.createAssignment),
)
assignmentRouter.get(
  '/:id',
  READ,
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(assignmentController.getAssignment),
)
assignmentRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: assignmentIdParamSchema, body: updateAssignmentSchema }),
  asyncHandler(assignmentController.updateAssignment),
)

assignmentRouter.post(
  '/:id/publish',
  MANAGE,
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(assignmentController.publishAssignment),
)
assignmentRouter.post(
  '/:id/close',
  MANAGE,
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(assignmentController.closeAssignment),
)
assignmentRouter.post(
  '/:id/archive',
  MANAGE,
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(assignmentController.archiveAssignment),
)
assignmentRouter.post(
  '/:id/cancel',
  MANAGE,
  validate({ params: assignmentIdParamSchema, body: cancelAssignmentSchema }),
  asyncHandler(assignmentController.cancelAssignment),
)

assignmentRouter.post(
  '/:id/attachments/signature',
  MANAGE,
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(assignmentController.getAttachmentUploadSignature),
)
assignmentRouter.post(
  '/:id/attachments',
  MANAGE,
  validate({ params: assignmentIdParamSchema, body: confirmAttachmentSchema }),
  asyncHandler(assignmentController.confirmAttachment),
)
assignmentRouter.delete(
  '/:id/attachments/:attachmentId',
  MANAGE,
  validate({ params: attachmentIdParamSchema }),
  asyncHandler(assignmentController.removeAttachment),
)
assignmentRouter.get(
  '/:id/attachments/:attachmentId/delivery-url',
  READ,
  validate({ params: attachmentIdParamSchema }),
  asyncHandler(assignmentController.getAttachmentDeliveryUrl),
)

// Submissions/grading sub-resource — a distinct `assignments:grade` permission for the grading actions specifically (never folded into `assignments:manage`, matching `courses:publish`'s own precedent for a significant, separately-grantable action).
assignmentRouter.get(
  '/:id/submissions',
  READ,
  validate({ params: assignmentSubmissionsParamSchema, query: listSubmissionsQuerySchema }),
  asyncHandler(submissionController.listSubmissions),
)
assignmentRouter.get(
  '/:id/submissions/students/:studentId/history',
  READ,
  validate({ params: assignmentStudentParamSchema }),
  asyncHandler(submissionController.getAttemptHistory),
)
assignmentRouter.get(
  '/:id/submissions/:submissionId',
  READ,
  validate({ params: submissionIdParamSchema }),
  asyncHandler(submissionController.getSubmission),
)
assignmentRouter.patch(
  '/:id/submissions/:submissionId/grade',
  GRADE,
  validate({ params: submissionIdParamSchema, body: gradeSubmissionSchema }),
  asyncHandler(submissionController.gradeSubmission),
)
assignmentRouter.post(
  '/:id/submissions/:submissionId/return',
  GRADE,
  validate({ params: submissionIdParamSchema, body: returnSubmissionSchema }),
  asyncHandler(submissionController.returnSubmission),
)
