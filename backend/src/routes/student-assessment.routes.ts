import { Router } from 'express'

import * as studentAssessmentController from '../controllers/student-assessment.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  saveAnswersSchema,
  studentAssessmentIdParamSchema,
  studentAttemptIdParamSchema,
} from '../validators/student-assessment.validator'

/** Self-scoped `/api/v1/student/assessments/*` — mirrors the `requireRole('STUDENT')`-only gate every other student namespace uses; `STUDENT` carries no permission-catalog entries by design. */
export const studentAssessmentRouter = Router()

studentAssessmentRouter.use(requireAuth, requireRole('STUDENT'))

studentAssessmentRouter.get(
  '/assessments',
  asyncHandler(studentAssessmentController.listMyAssessments),
)
studentAssessmentRouter.get(
  '/assessments/:id',
  validate({ params: studentAssessmentIdParamSchema }),
  asyncHandler(studentAssessmentController.getMyAssessment),
)
studentAssessmentRouter.post(
  '/assessments/:id/start',
  validate({ params: studentAssessmentIdParamSchema }),
  asyncHandler(studentAssessmentController.startAttempt),
)

studentAssessmentRouter.get(
  '/assessments/attempts/:attemptId',
  validate({ params: studentAttemptIdParamSchema }),
  asyncHandler(studentAssessmentController.getMyAttempt),
)
studentAssessmentRouter.patch(
  '/assessments/attempts/:attemptId/answers',
  validate({ params: studentAttemptIdParamSchema, body: saveAnswersSchema }),
  asyncHandler(studentAssessmentController.saveAnswers),
)
studentAssessmentRouter.post(
  '/assessments/attempts/:attemptId/submit',
  validate({ params: studentAttemptIdParamSchema }),
  asyncHandler(studentAssessmentController.submitAttempt),
)
studentAssessmentRouter.post(
  '/assessments/attempts/:attemptId/focus-loss',
  validate({ params: studentAttemptIdParamSchema }),
  asyncHandler(studentAssessmentController.recordFocusLoss),
)
