import type { Request, Response } from 'express'

import { trainerAssessmentService } from '../services/trainer-assessment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { AssessmentIdParam } from '../validators/assessment.validator'
import type {
  AttemptIdParam,
  GradeAttemptInput,
  ListAttemptsQuery,
} from '../validators/assessment-attempt.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listMyAssessments(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const data = await trainerAssessmentService.listMyAssessments(actor.id)
  sendSuccess(res, { data })
}

export async function getMyAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await trainerAssessmentService.getMyAssessment(actor.id, id)
  sendSuccess(res, { data })
}

export async function listMyAttempts(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssessmentIdParam
  const query = req.validated?.query as ListAttemptsQuery
  const data = await trainerAssessmentService.listMyAttempts(actor.id, id, query)
  sendSuccess(res, { data })
}

export async function getMyAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as AttemptIdParam
  const data = await trainerAssessmentService.getMyAttempt(actor.id, attemptId)
  sendSuccess(res, { data })
}

export async function gradeMyAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as AttemptIdParam
  const input = req.validated?.body as GradeAttemptInput
  const data = await trainerAssessmentService.gradeMyAttempt(
    actor.id,
    attemptId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Grades saved', data })
}
