import { Router } from 'express'

import * as studentLearningController from '../controllers/student-learning.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireRole } from '../middlewares/require-role.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  courseProgressParamSchema,
  lessonParamSchema,
  updateLessonProgressSchema,
} from '../validators/student-learning.validator'

/**
 * The Learning Player's own API surface (Phase 11B) — mounted at the same
 * `/api/v1/student` prefix as `studentPortalRouter` (Phase 11A), matching
 * the existing `courseRouter`+`curriculumRouter`+`lessonContentRouter`
 * multi-router-one-prefix precedent rather than nesting everything into one
 * growing file. Same `requireRole('STUDENT')`-only gate — no permission
 * catalog entries apply here either.
 */
export const studentLearningRouter = Router()

studentLearningRouter.use(requireAuth, requireRole('STUDENT'))

studentLearningRouter.get(
  '/courses/:courseId/progress',
  validate({ params: courseProgressParamSchema }),
  asyncHandler(studentLearningController.getCourseProgress),
)

studentLearningRouter.get(
  '/courses/:courseId/lessons/:lessonId',
  validate({ params: lessonParamSchema }),
  asyncHandler(studentLearningController.getLessonDetail),
)

studentLearningRouter.get(
  '/courses/:courseId/lessons/:lessonId/media',
  validate({ params: lessonParamSchema }),
  asyncHandler(studentLearningController.getLessonMediaUrl),
)

studentLearningRouter.patch(
  '/courses/:courseId/lessons/:lessonId/progress',
  validate({ params: lessonParamSchema, body: updateLessonProgressSchema }),
  asyncHandler(studentLearningController.updateLessonProgress),
)

studentLearningRouter.post(
  '/courses/:courseId/lessons/:lessonId/complete',
  validate({ params: lessonParamSchema }),
  asyncHandler(studentLearningController.markLessonComplete),
)
