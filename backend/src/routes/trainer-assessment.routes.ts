import { Router } from 'express'

import * as trainerAssessmentController from '../controllers/trainer-assessment.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { assessmentIdParamSchema } from '../validators/assessment.validator'
import {
  attemptIdParamSchema,
  gradeAttemptSchema,
  listAttemptsQuerySchema,
} from '../validators/assessment-attempt.validator'

/** Self-scoped `/api/v1/trainer/assessments*` — role + ownership (batches the trainer teaches), never a permission grant, mirrors `trainer-assignment.routes.ts` exactly. */
export const trainerAssessmentRouter = Router()

trainerAssessmentRouter.use(requireAuth, requireRole('TRAINER'))

trainerAssessmentRouter.get(
  '/assessments',
  asyncHandler(trainerAssessmentController.listMyAssessments),
)
trainerAssessmentRouter.get(
  '/assessments/:id',
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(trainerAssessmentController.getMyAssessment),
)
trainerAssessmentRouter.get(
  '/assessments/:id/attempts',
  validate({ params: assessmentIdParamSchema, query: listAttemptsQuerySchema }),
  asyncHandler(trainerAssessmentController.listMyAttempts),
)

trainerAssessmentRouter.get(
  '/assessment-attempts/:attemptId',
  validate({ params: attemptIdParamSchema }),
  asyncHandler(trainerAssessmentController.getMyAttempt),
)
trainerAssessmentRouter.patch(
  '/assessment-attempts/:attemptId/grade',
  validate({ params: attemptIdParamSchema, body: gradeAttemptSchema }),
  asyncHandler(trainerAssessmentController.gradeMyAttempt),
)
