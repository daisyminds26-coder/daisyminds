import type { Request, Response } from 'express'

import { questionService } from '../services/question.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  CreateQuestionInput,
  ListQuestionsQuery,
  QuestionIdParam,
  UpdateQuestionInput,
} from '../validators/question.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listQuestions(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListQuestionsQuery
  const { data, meta } = await questionService.listQuestions(query)
  sendSuccess(res, { data, meta })
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as QuestionIdParam
  const data = await questionService.getQuestion(id)
  sendSuccess(res, { data })
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateQuestionInput
  const data = await questionService.createQuestion(input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Question created', data, statusCode: 201 })
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as QuestionIdParam
  const input = req.validated?.body as UpdateQuestionInput
  const data = await questionService.updateQuestion(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Question updated', data })
}

export async function archiveQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as QuestionIdParam
  const data = await questionService.archiveQuestion(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Question archived', data })
}

export async function duplicateQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as QuestionIdParam
  const data = await questionService.duplicateQuestion(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Question duplicated', data, statusCode: 201 })
}
