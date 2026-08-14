import { Router } from 'express'

import * as assessmentController from '../controllers/assessment.controller'
import * as attemptController from '../controllers/assessment-attempt.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  assessmentIdParamSchema,
  cancelAssessmentSchema,
  createAssessmentSchema,
  listAssessmentsQuerySchema,
  replaceSectionsSchema,
  updateAssessmentSchema,
} from '../validators/assessment.validator'
import {
  assessmentAttemptParamSchema,
  exportAssessmentResultsQuerySchema,
  gradeAttemptSchema,
  listAttemptsQuerySchema,
} from '../validators/assessment-attempt.validator'

export const assessmentRouter = Router()

assessmentRouter.use(requireAuth)

const READ = requirePermission('assessments:read')
const MANAGE = requirePermission('assessments:manage')
const GRADE = requirePermission('assessments:grade')
const EXPORT = requirePermission('assessments:export')

// Order matters: `/export` must be registered before the `/:id` param route.
assessmentRouter.get(
  '/export',
  EXPORT,
  validate({ query: exportAssessmentResultsQuerySchema }),
  asyncHandler(attemptController.exportResults),
)

assessmentRouter.get(
  '/',
  READ,
  validate({ query: listAssessmentsQuerySchema }),
  asyncHandler(assessmentController.listAssessments),
)
assessmentRouter.post(
  '/',
  MANAGE,
  validate({ body: createAssessmentSchema }),
  asyncHandler(assessmentController.createAssessment),
)
assessmentRouter.get(
  '/:id',
  READ,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.getAssessment),
)
assessmentRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: assessmentIdParamSchema, body: updateAssessmentSchema }),
  asyncHandler(assessmentController.updateAssessment),
)

assessmentRouter.post(
  '/:id/sections',
  MANAGE,
  validate({ params: assessmentIdParamSchema, body: replaceSectionsSchema }),
  asyncHandler(assessmentController.replaceSections),
)
assessmentRouter.post(
  '/:id/readiness-check',
  MANAGE,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.checkReadiness),
)
assessmentRouter.post(
  '/:id/publish',
  MANAGE,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.publishAssessment),
)
assessmentRouter.post(
  '/:id/close',
  MANAGE,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.closeAssessment),
)
assessmentRouter.post(
  '/:id/publish-results',
  MANAGE,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.publishResults),
)
assessmentRouter.post(
  '/:id/archive',
  MANAGE,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(assessmentController.archiveAssessment),
)
assessmentRouter.post(
  '/:id/cancel',
  MANAGE,
  validate({ params: assessmentIdParamSchema, body: cancelAssessmentSchema }),
  asyncHandler(assessmentController.cancelAssessment),
)

// Attempts / grading sub-resource — a distinct `assessments:grade` permission, matching `assignments:grade`'s own precedent for a significant, separately-grantable action.
assessmentRouter.get(
  '/:id/attempts',
  READ,
  validate({ params: assessmentIdParamSchema, query: listAttemptsQuerySchema }),
  asyncHandler(attemptController.listAttempts),
)
assessmentRouter.get(
  '/:id/results',
  READ,
  validate({ params: assessmentIdParamSchema }),
  asyncHandler(attemptController.getResultsSummary),
)
assessmentRouter.get(
  '/:id/attempts/:attemptId',
  READ,
  validate({ params: assessmentAttemptParamSchema }),
  asyncHandler(attemptController.getAttempt),
)
assessmentRouter.patch(
  '/:id/attempts/:attemptId/grade',
  GRADE,
  validate({ params: assessmentAttemptParamSchema, body: gradeAttemptSchema }),
  asyncHandler(attemptController.gradeAttempt),
)
