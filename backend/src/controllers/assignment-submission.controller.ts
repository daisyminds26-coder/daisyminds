import type { Request, Response } from 'express'

import { assignmentSubmissionService } from '../services/assignment-submission.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  AssignmentStudentParam,
  AssignmentSubmissionsParam,
  ExportSubmissionsQuery,
  GradeSubmissionInput,
  ListSubmissionsQuery,
  ReturnSubmissionInput,
  SubmissionIdParam,
} from '../validators/assignment-submission.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

/** `ADMIN`/`SUPER_ADMIN` may override an assignment's own `allowResubmission` setting when returning a submission; a `TRAINER` never can (task's own explicit rule) — computed here so the same controller serves both the admin and trainer routers correctly. */
function canOverrideResubmission(actor: { role: string }): boolean {
  return actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN'
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssignmentSubmissionsParam
  const query = req.validated?.query as ListSubmissionsQuery
  const data = await assignmentSubmissionService.listSubmissions(id, {
    status: query.status,
    lateOnly: query.lateOnly,
    search: query.search,
  })
  sendSuccess(res, { data })
}

export async function getSubmission(req: Request, res: Response): Promise<void> {
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const data = await assignmentSubmissionService.getSubmission(id, submissionId)
  sendSuccess(res, { data })
}

export async function getAttemptHistory(req: Request, res: Response): Promise<void> {
  const { id, studentId } = req.validated?.params as AssignmentStudentParam
  const data = await assignmentSubmissionService.getAttemptHistory(id, studentId)
  sendSuccess(res, { data })
}

export async function gradeSubmission(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const input = req.validated?.body as GradeSubmissionInput
  const data = await assignmentSubmissionService.gradeSubmission(
    id,
    submissionId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Submission graded', data })
}

export async function exportSubmissions(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ExportSubmissionsQuery
  const csv = await assignmentSubmissionService.exportSubmissionsCsv(query)
  res.status(200).type('text/csv').attachment('assignment-submissions-export.csv').send(csv)
}

export async function returnSubmission(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const input = req.validated?.body as ReturnSubmissionInput
  const data = await assignmentSubmissionService.returnSubmission(
    id,
    submissionId,
    input,
    actor,
    getRequestContext(req),
    canOverrideResubmission(actor),
  )
  sendSuccess(res, { message: 'Submission returned for resubmission', data })
}
