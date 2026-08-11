import { Router } from 'express'

import * as lessonContentController from '../controllers/lesson-content.controller'
import * as lessonResourceController from '../controllers/lesson-resource.controller'
import * as courseLaunchReadinessController from '../controllers/course-launch-readiness.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { courseIdParamSchema, lessonIdParamSchema } from '../validators/curriculum.validator'
import {
  confirmDocumentSchema,
  confirmMediaAssetSchema,
  updateExternalLinkSchema,
  updateTextContentSchema,
} from '../validators/lesson-content.validator'
import {
  confirmResourceSchema,
  reorderResourcesSchema,
  resourceIdParamSchema,
  updateResourceMetadataSchema,
} from '../validators/lesson-resource.validator'

/**
 * Mounted at the same `${API_PREFIX}/courses` base as `course.routes.ts`
 * and `curriculum.routes.ts` (a separate `Router` instance, matching the
 * established pattern — ARCHITECTURE.md §20/§21). Every route here is
 * nested at least as deep as `/:courseId/modules/:moduleId/lessons/:lessonId`,
 * so no path collides with either of the other two routers.
 *
 * Reuses `courses:read`/`courses:manage`/`courses:publish` — no new
 * permission was added (SECURITY.md §3); see ARCHITECTURE.md §21 for why
 * `courses:media:manage` was considered and rejected as permission bloat.
 */
export const lessonContentRouter = Router()

lessonContentRouter.use(requireAuth)

const READ = requirePermission('courses:read')
const MANAGE = requirePermission('courses:manage')

const lessonBase = '/:courseId/modules/:moduleId/lessons/:lessonId'

// ---- Content --------------------------------------------------------------

lessonContentRouter.get(
  `${lessonBase}/content`,
  READ,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.getContent),
)

lessonContentRouter.post(
  `${lessonBase}/content/readiness-check`,
  READ,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.checkContentReadiness),
)

lessonContentRouter.put(
  `${lessonBase}/content/text`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: updateTextContentSchema }),
  asyncHandler(lessonContentController.updateTextContent),
)

lessonContentRouter.put(
  `${lessonBase}/content/external-link`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: updateExternalLinkSchema }),
  asyncHandler(lessonContentController.updateExternalLink),
)

lessonContentRouter.post(
  `${lessonBase}/content/video/signature`,
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.getVideoUploadSignature),
)

lessonContentRouter.post(
  `${lessonBase}/content/video/verify`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: confirmMediaAssetSchema }),
  asyncHandler(lessonContentController.verifyVideo),
)

lessonContentRouter.get(
  `${lessonBase}/content/video/preview-url`,
  READ,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.getVideoPreviewUrl),
)

lessonContentRouter.delete(
  `${lessonBase}/content/video`,
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.removeVideo),
)

lessonContentRouter.post(
  `${lessonBase}/content/document/signature`,
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.getDocumentUploadSignature),
)

lessonContentRouter.post(
  `${lessonBase}/content/document/verify`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: confirmDocumentSchema }),
  asyncHandler(lessonContentController.verifyDocument),
)

lessonContentRouter.get(
  `${lessonBase}/content/document/preview-url`,
  READ,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.getDocumentPreviewUrl),
)

lessonContentRouter.delete(
  `${lessonBase}/content/document`,
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonContentController.removeDocument),
)

// ---- Resources --------------------------------------------------------------

lessonContentRouter.post(
  `${lessonBase}/resources/signature`,
  MANAGE,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonResourceController.getUploadSignature),
)

lessonContentRouter.post(
  `${lessonBase}/resources/verify`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: confirmResourceSchema }),
  asyncHandler(lessonResourceController.verifyAndAddResource),
)

// Order matters: `/resources/reorder` must be registered before `/resources/:resourceId`.
lessonContentRouter.post(
  `${lessonBase}/resources/reorder`,
  MANAGE,
  validate({ params: lessonIdParamSchema, body: reorderResourcesSchema }),
  asyncHandler(lessonResourceController.reorderResources),
)

lessonContentRouter.get(
  `${lessonBase}/resources`,
  READ,
  validate({ params: lessonIdParamSchema }),
  asyncHandler(lessonResourceController.listResources),
)

lessonContentRouter.patch(
  `${lessonBase}/resources/:resourceId`,
  MANAGE,
  validate({ params: resourceIdParamSchema, body: updateResourceMetadataSchema }),
  asyncHandler(lessonResourceController.updateResourceMetadata),
)

lessonContentRouter.get(
  `${lessonBase}/resources/:resourceId/delivery-url`,
  READ,
  validate({ params: resourceIdParamSchema }),
  asyncHandler(lessonResourceController.getDeliveryUrl),
)

lessonContentRouter.delete(
  `${lessonBase}/resources/:resourceId`,
  MANAGE,
  validate({ params: resourceIdParamSchema }),
  asyncHandler(lessonResourceController.deleteResource),
)

// ---- Course launch readiness ------------------------------------------------

lessonContentRouter.get(
  '/:courseId/launch-readiness',
  READ,
  validate({ params: courseIdParamSchema }),
  asyncHandler(courseLaunchReadinessController.getLaunchReadiness),
)
