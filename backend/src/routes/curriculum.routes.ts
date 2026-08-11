import { Router } from 'express'

import * as curriculumController from '../controllers/curriculum.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  courseIdParamSchema,
  courseLessonIdParamSchema,
  createLessonSchema,
  createModuleSchema,
  lessonIdParamSchema,
  moduleIdParamSchema,
  moveLessonSchema,
  reorderLessonsSchema,
  reorderModulesSchema,
  updateLessonSchema,
  updateModuleSchema,
} from '../validators/curriculum.validator'

/**
 * Mounted at the same `${API_PREFIX}/courses` base as `course.routes.ts`
 * (a separate `Router` instance, not merged into it — ARCHITECTURE.md §20's
 * "avoid route duplication and deeply nested route chaos" note). No path
 * collision is possible: every route here is nested at least one segment
 * deeper than anything `course.routes.ts` registers (`/:id`, `/:id/publish`,
 * etc. are all exactly two segments; everything below starts at
 * `/:courseId/curriculum` or `/:courseId/modules`/`/:courseId/lessons`).
 *
 * Curriculum reuses the existing `courses:read`/`courses:manage`/
 * `courses:publish` permissions rather than adding a new `curriculum:*`
 * catalog (SECURITY.md §3) — no separate seed-roles change was needed.
 */
export const curriculumRouter = Router()

curriculumRouter.use(requireAuth)

const READ = requirePermission('courses:read')
const MANAGE = requirePermission('courses:manage')
const PUBLISH = requirePermission('courses:publish')

curriculumRouter.get(
  '/:courseId/curriculum',
  READ,
  validate({ params: courseIdParamSchema }),
  asyncHandler(curriculumController.getCurriculum),
)

curriculumRouter.post(
  '/:courseId/curriculum/readiness-check',
  READ,
  validate({ params: courseIdParamSchema }),
  asyncHandler(curriculumController.checkCurriculumReadiness),
)

// Order matters: `/modules/reorder` must be registered before `/modules/:moduleId` routes.
curriculumRouter.post(
  '/:courseId/modules/reorder',
  MANAGE,
  validate({ params: courseIdParamSchema, body: reorderModulesSchema }),
  asyncHandler(curriculumController.reorderModules),
)

curriculumRouter.post(
  '/:courseId/modules',
  MANAGE,
  validate({ params: courseIdParamSchema, body: createModuleSchema }),
  asyncHandler(curriculumController.createModule),
)

curriculumRouter.patch(
  '/:courseId/modules/:moduleId',
  MANAGE,
  validate({ params: moduleIdParamSchema, body: updateModuleSchema }),
  asyncHandler(curriculumController.updateModule),
)

curriculumRouter.delete(
  '/:courseId/modules/:moduleId',
  MANAGE,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.deleteModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/archive',
  MANAGE,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.archiveModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/restore',
  MANAGE,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.restoreModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/duplicate',
  MANAGE,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.duplicateModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/publish',
  PUBLISH,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.publishModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/unpublish',
  PUBLISH,
  validate({ params: moduleIdParamSchema }),
  asyncHandler(curriculumController.unpublishModule),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons',
  MANAGE,
  validate({ params: moduleIdParamSchema, body: createLessonSchema }),
  asyncHandler(curriculumController.createLesson),
)

curriculumRouter.patch(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  MANAGE,
  validate({ params: lessonIdParamSchema, body: updateLessonSchema }),
  asyncHandler(curriculumController.updateLesson),
)

curriculumRouter.delete(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.deleteLesson),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/archive',
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.archiveLesson),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/restore',
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.restoreLesson),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/duplicate',
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.duplicateLesson),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/publish',
  PUBLISH,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.publishLesson),
)

curriculumRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/unpublish',
  PUBLISH,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(curriculumController.unpublishLesson),
)

// Order matters: `/lessons/reorder` must be registered before `/lessons/:lessonId/move`.
curriculumRouter.post(
  '/:courseId/lessons/reorder',
  MANAGE,
  validate({ params: courseIdParamSchema, body: reorderLessonsSchema }),
  asyncHandler(curriculumController.reorderLessons),
)

curriculumRouter.post(
  '/:courseId/lessons/:lessonId/move',
  MANAGE,
  validate({ params: courseLessonIdParamSchema, body: moveLessonSchema }),
  asyncHandler(curriculumController.moveLesson),
)
