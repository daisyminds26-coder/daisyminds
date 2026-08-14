import type { Request, Response } from 'express'

import { assessmentService } from '../services/assessment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  AssessmentIdParam,
  CancelAssessmentInput,
  CreateAssessmentInput,
  ListAssessmentsQuery,
  ReplaceSectionsInput,
  UpdateAssessmentInput,
} from '../validators/assessment.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listAssessments(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListAssessmentsQuery
  const { data, meta } = await assessmentService.listAssessments(query)
  sendSuccess(res, { data, meta })
}

export async function getAssessment(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.getAssessment(id)
  sendSuccess(res, { data })
}

export async function createAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateAssessmentInput
  const data = await assessmentService.createAssessment(input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment created', data, statusCode: 201 })
}

export async function updateAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const input = req.validated?.body as UpdateAssessmentInput
  const data = await assessmentService.updateAssessment(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment updated', data })
}

export async function replaceSections(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const input = req.validated?.body as ReplaceSectionsInput
  const data = await assessmentService.replaceSections(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Sections updated', data })
}

export async function checkReadiness(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.checkReadiness(id)
  sendSuccess(res, { data })
}

export async function publishAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.transition(id, 'PUBLISHED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment published', data })
}

export async function closeAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.transition(id, 'CLOSED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment closed', data })
}

export async function publishResults(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.transition(
    id,
    'RESULT_PUBLISHED',
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Results published', data })
}

export async function archiveAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentService.transition(id, 'ARCHIVED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment archived', data })
}

export async function cancelAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const input = req.validated?.body as CancelAssessmentInput
  const data = await assessmentService.cancelAssessment(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assessment cancelled', data })
}
