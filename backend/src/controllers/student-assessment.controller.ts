import type { Request, Response } from 'express'

import { studentAssessmentService } from '../services/student-assessment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  SaveAnswersInput,
  StudentAssessmentIdParam,
  StudentAttemptIdParam,
} from '../validators/student-assessment.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

export async function listMyAssessments(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const data = await studentAssessmentService.listMyAssessments(actor.id)
  sendSuccess(res, { data })
}

export async function getMyAssessment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentAssessmentIdParam
  const data = await studentAssessmentService.getMyAssessment(actor.id, id)
  sendSuccess(res, { data })
}

export async function startAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as StudentAssessmentIdParam
  const data = await studentAssessmentService.startOrResumeAttempt(actor.id, id)
  sendSuccess(res, { message: 'Attempt started', data })
}

export async function getMyAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as StudentAttemptIdParam
  const data = await studentAssessmentService.getMyAttempt(actor.id, attemptId)
  sendSuccess(res, { data })
}

export async function saveAnswers(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as StudentAttemptIdParam
  const input = req.validated?.body as SaveAnswersInput
  const data = await studentAssessmentService.saveAnswers(actor.id, attemptId, input)
  sendSuccess(res, { data })
}

export async function submitAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as StudentAttemptIdParam
  const data = await studentAssessmentService.submitAttempt(actor.id, attemptId)
  sendSuccess(res, { message: 'Attempt submitted', data })
}

export async function recordFocusLoss(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { attemptId } = req.validated?.params as StudentAttemptIdParam
  const data = await studentAssessmentService.recordFocusLoss(actor.id, attemptId)
  sendSuccess(res, { data })
}
