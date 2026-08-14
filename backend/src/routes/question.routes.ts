import { Router } from 'express'

import * as questionController from '../controllers/question.controller'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requirePermission } from '../middlewares/require-permission.middleware'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  createQuestionSchema,
  listQuestionsQuerySchema,
  questionIdParamSchema,
  updateQuestionSchema,
} from '../validators/question.validator'

export const questionRouter = Router()

questionRouter.use(requireAuth)

const READ = requirePermission('questions:read')
const MANAGE = requirePermission('questions:manage')

questionRouter.get(
  '/',
  READ,
  validate({ query: listQuestionsQuerySchema }),
  asyncHandler(questionController.listQuestions),
)
questionRouter.post(
  '/',
  MANAGE,
  validate({ body: createQuestionSchema }),
  asyncHandler(questionController.createQuestion),
)
questionRouter.get(
  '/:id',
  READ,
  validate({ params: questionIdParamSchema }),
  asyncHandler(questionController.getQuestion),
)
questionRouter.patch(
  '/:id',
  MANAGE,
  validate({ params: questionIdParamSchema, body: updateQuestionSchema }),
  asyncHandler(questionController.updateQuestion),
)
questionRouter.post(
  '/:id/archive',
  MANAGE,
  validate({ params: questionIdParamSchema }),
  asyncHandler(questionController.archiveQuestion),
)
questionRouter.post(
  '/:id/activate',
  MANAGE,
  validate({ params: questionIdParamSchema }),
  asyncHandler(questionController.activateQuestion),
)
questionRouter.post(
  '/:id/duplicate',
  MANAGE,
  validate({ params: questionIdParamSchema }),
  asyncHandler(questionController.duplicateQuestion),
)
