import type { Request, Response } from 'express'

import { assessmentGradingService } from '../services/assessment-grading.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { AssessmentIdParam } from '../validators/assessment.validator'
import type {
  AssessmentAttemptParam,
  ExportAssessmentResultsQuery,
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

export async function listAttempts(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssessmentIdParam
  const query = req.validated?.query as ListAttemptsQuery
  const data = await assessmentGradingService.listAttempts(id, query)
  sendSuccess(res, { data })
}

export async function getAttempt(req: Request, res: Response): Promise<void> {
  const { id, attemptId } = req.validated?.params as AssessmentAttemptParam
  const data = await assessmentGradingService.getAttempt(id, attemptId)
  sendSuccess(res, { data })
}

export async function gradeAttempt(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, attemptId } = req.validated?.params as AssessmentAttemptParam
  const input = req.validated?.body as GradeAttemptInput
  const data = await assessmentGradingService.gradeAttempt(
    id,
    attemptId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Grades saved', data })
}

export async function getResultsSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssessmentIdParam
  const data = await assessmentGradingService.getResultsSummary(id)
  sendSuccess(res, { data })
}

export async function exportResults(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ExportAssessmentResultsQuery
  const csv = await assessmentGradingService.exportResultsCsv(query)
  res.status(200).type('text/csv').attachment('assessment-results-export.csv').send(csv)
}
