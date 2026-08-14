import type { Request, Response } from 'express'

import { studentAssignmentService } from '../services/student-assignment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  SaveDraftInput,
  StudentAssignmentIdParam,
  StudentAttachmentIdParam,
  StudentFileIdParam,
  SubmitAssignmentInput,
  UploadFileInput,
} from '../validators/student-assignment.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

export async function listMyAssignments(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const data = await studentAssignmentService.listMyAssignments(user.id)
  sendSuccess(res, { data })
}

export async function getMyAssignment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const data = await studentAssignmentService.getMyAssignment(user.id, id)
  sendSuccess(res, { data })
}

export async function getMyAttemptHistory(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const data = await studentAssignmentService.getMyAttemptHistory(user.id, id)
  sendSuccess(res, { data })
}

export async function saveDraft(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const input = req.validated?.body as SaveDraftInput
  const data = await studentAssignmentService.saveDraft(user.id, id, input)
  sendSuccess(res, { message: 'Draft saved', data })
}

export async function submitAssignment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const input = req.validated?.body as SubmitAssignmentInput
  const data = await studentAssignmentService.submitAssignment(user.id, id, input)
  sendSuccess(res, { message: 'Assignment submitted', data })
}

export async function getFileUploadSignature(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const data = await studentAssignmentService.getFileUploadSignature(user.id, id)
  sendSuccess(res, { data })
}

export async function confirmFile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentAssignmentIdParam
  const input = req.validated?.body as UploadFileInput
  const data = await studentAssignmentService.confirmFile(user.id, id, input)
  sendSuccess(res, { message: 'File attached', data, statusCode: 201 })
}

export async function removeFile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, fileId } = req.validated?.params as StudentFileIdParam
  const data = await studentAssignmentService.removeFile(user.id, id, fileId)
  sendSuccess(res, { message: 'File removed', data })
}

export async function getSubmissionFileDeliveryUrl(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id, fileId } = req.validated?.params as StudentFileIdParam
  const data = await studentAssignmentService.getSubmissionFileDeliveryUrl(user.id, id, fileId)
  sendSuccess(res, { data })
}

export async function getAssignmentAttachmentDeliveryUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireUser(req)
  const { id, attachmentId } = req.validated?.params as StudentAttachmentIdParam
  const data = await studentAssignmentService.getAssignmentAttachmentDeliveryUrl(
    user.id,
    id,
    attachmentId,
  )
  sendSuccess(res, { data })
}
