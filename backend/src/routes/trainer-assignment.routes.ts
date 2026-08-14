import { Router } from 'express'

import * as trainerAssignmentController from '../controllers/trainer-assignment.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { assignmentIdParamSchema } from '../validators/assignment.validator'
import {
  gradeSubmissionSchema,
  listSubmissionsQuerySchema,
  returnSubmissionSchema,
  submissionIdParamSchema,
} from '../validators/assignment-submission.validator'
import { trainerAssignmentStudentParamSchema } from '../validators/trainer-assignment.validator'

/** Self-scoped `/api/v1/trainer/assignments/*` — ownership-checked (a batch this trainer teaches), never a permission grant, mirroring `trainer-live-class.routes.ts`'s own precedent exactly. */
export const trainerAssignmentRouter = Router()

trainerAssignmentRouter.use(requireAuth, requireRole('TRAINER'))

trainerAssignmentRouter.get(
  '/assignments',
  asyncHandler(trainerAssignmentController.listMyAssignments),
)
trainerAssignmentRouter.get(
  '/assignments/:id',
  validate({ params: assignmentIdParamSchema }),
  asyncHandler(trainerAssignmentController.getMyAssignment),
)
trainerAssignmentRouter.get(
  '/assignments/:id/submissions',
  validate({ params: assignmentIdParamSchema, query: listSubmissionsQuerySchema }),
  asyncHandler(trainerAssignmentController.listMySubmissions),
)
trainerAssignmentRouter.get(
  '/assignments/:id/submissions/students/:studentId/history',
  validate({ params: trainerAssignmentStudentParamSchema }),
  asyncHandler(trainerAssignmentController.getMyAttemptHistory),
)
trainerAssignmentRouter.get(
  '/assignments/:id/submissions/:submissionId',
  validate({ params: submissionIdParamSchema }),
  asyncHandler(trainerAssignmentController.getMySubmission),
)
trainerAssignmentRouter.patch(
  '/assignments/:id/submissions/:submissionId/grade',
  validate({ params: submissionIdParamSchema, body: gradeSubmissionSchema }),
  asyncHandler(trainerAssignmentController.gradeMySubmission),
)
trainerAssignmentRouter.post(
  '/assignments/:id/submissions/:submissionId/return',
  validate({ params: submissionIdParamSchema, body: returnSubmissionSchema }),
  asyncHandler(trainerAssignmentController.returnMySubmission),
)
