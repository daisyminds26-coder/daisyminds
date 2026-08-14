import type { Request, Response } from 'express'

import { trainerAssignmentService } from '../services/trainer-assignment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { AssignmentIdParam } from '../validators/assignment.validator'
import type {
  GradeSubmissionInput,
  ListSubmissionsQuery,
  ReturnSubmissionInput,
  SubmissionIdParam,
} from '../validators/assignment-submission.validator'
import type { TrainerAssignmentStudentParam } from '../validators/trainer-assignment.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listMyAssignments(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const data = await trainerAssignmentService.listMyAssignments(user.id)
  sendSuccess(res, { data })
}

export async function getMyAssignment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await trainerAssignmentService.getMyAssignment(user.id, id)
  sendSuccess(res, { data })
}

export async function listMySubmissions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const query = req.validated?.query as ListSubmissionsQuery
  const data = await trainerAssignmentService.listMySubmissions(user.id, id, {
    status: query.status,
    lateOnly: query.lateOnly,
    search: query.search,
  })
  sendSuccess(res, { data })
}

export async function getMySubmission(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const data = await trainerAssignmentService.getMySubmission(user.id, id, submissionId)
  sendSuccess(res, { data })
}

export async function getMyAttemptHistory(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, studentId } = req.validated?.params as TrainerAssignmentStudentParam
  const data = await trainerAssignmentService.getMyAttemptHistory(user.id, id, studentId)
  sendSuccess(res, { data })
}

export async function gradeMySubmission(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const input = req.validated?.body as GradeSubmissionInput
  const data = await trainerAssignmentService.gradeMySubmission(
    user.id,
    id,
    submissionId,
    input,
    user,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Submission graded', data })
}

export async function returnMySubmission(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, submissionId } = req.validated?.params as SubmissionIdParam
  const input = req.validated?.body as ReturnSubmissionInput
  const data = await trainerAssignmentService.returnMySubmission(
    user.id,
    id,
    submissionId,
    input,
    user,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Submission returned for resubmission', data })
}
