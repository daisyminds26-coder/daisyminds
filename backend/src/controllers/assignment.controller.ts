import type { Request, Response } from 'express'

import { assignmentService } from '../services/assignment.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  AssignmentIdParam,
  AttachmentIdParam,
  CancelAssignmentInput,
  ConfirmAttachmentInput,
  CreateAssignmentInput,
  ListAssignmentsQuery,
  UpdateAssignmentInput,
} from '../validators/assignment.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListAssignmentsQuery
  const { data, meta } = await assignmentService.listAssignments(query)
  sendSuccess(res, { data, meta })
}

export async function getAssignment(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await assignmentService.getAssignment(id)
  sendSuccess(res, { data })
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateAssignmentInput
  const data = await assignmentService.createAssignment(input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment created', data, statusCode: 201 })
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const input = req.validated?.body as UpdateAssignmentInput
  const data = await assignmentService.updateAssignment(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment updated', data })
}

export async function publishAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await assignmentService.transition(id, 'PUBLISHED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment published', data })
}

export async function closeAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await assignmentService.transition(id, 'CLOSED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment closed', data })
}

export async function archiveAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await assignmentService.transition(id, 'ARCHIVED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment archived', data })
}

export async function cancelAssignment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const input = req.validated?.body as CancelAssignmentInput
  const data = await assignmentService.cancelAssignment(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Assignment cancelled', data })
}

export async function getAttachmentUploadSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as AssignmentIdParam
  const data = await assignmentService.getAttachmentUploadSignature(id)
  sendSuccess(res, { data })
}

export async function confirmAttachment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as AssignmentIdParam
  const input = req.validated?.body as ConfirmAttachmentInput
  const data = await assignmentService.confirmAttachment(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Attachment added', data, statusCode: 201 })
}

export async function removeAttachment(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id, attachmentId } = req.validated?.params as AttachmentIdParam
  const data = await assignmentService.removeAttachment(
    id,
    attachmentId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Attachment removed', data })
}

export async function getAttachmentDeliveryUrl(req: Request, res: Response): Promise<void> {
  const { id, attachmentId } = req.validated?.params as AttachmentIdParam
  const data = await assignmentService.getAttachmentDeliveryUrl(id, attachmentId)
  sendSuccess(res, { data })
}
