import type { Request, Response } from 'express'

import { liveClassService } from '../services/live-class.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  CancelLiveClassInput,
  CreateLiveClassInput,
  GenerateCreateInput,
  GeneratePreviewInput,
  LiveClassIdParam,
  ListLiveClassesQuery,
  UpdateLiveClassInput,
} from '../validators/live-class.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listLiveClasses(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListLiveClassesQuery
  const { data, meta } = await liveClassService.listLiveClasses(query)
  sendSuccess(res, { data, meta })
}

export async function getLiveClass(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as LiveClassIdParam
  const dto = await liveClassService.getLiveClass(id)
  sendSuccess(res, { data: dto })
}

export async function createLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateLiveClassInput
  const dto = await liveClassService.createLiveClass(input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session created', data: dto, statusCode: 201 })
}

export async function updateLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as LiveClassIdParam
  const input = req.validated?.body as UpdateLiveClassInput
  const dto = await liveClassService.updateLiveClass(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session updated', data: dto })
}

export async function scheduleLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as LiveClassIdParam
  const dto = await liveClassService.transition(id, 'SCHEDULED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session scheduled', data: dto })
}

export async function startLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as LiveClassIdParam
  const dto = await liveClassService.transition(id, 'LIVE', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session started', data: dto })
}

export async function completeLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as LiveClassIdParam
  const dto = await liveClassService.transition(id, 'COMPLETED', actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session marked complete', data: dto })
}

export async function cancelLiveClass(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as LiveClassIdParam
  const input = req.validated?.body as CancelLiveClassInput
  const dto = await liveClassService.cancelLiveClass(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Session cancelled', data: dto })
}

export async function previewGeneration(req: Request, res: Response): Promise<void> {
  const input = req.validated?.body as GeneratePreviewInput
  const data = await liveClassService.previewGeneration(input)
  sendSuccess(res, { data })
}

export async function generateFromTimetable(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as GenerateCreateInput
  const result = await liveClassService.generateFromTimetable(input, actor, getRequestContext(req))
  sendSuccess(res, {
    message: `${String(result.created.length)} session(s) created, ${String(result.skipped)} skipped (already existed)`,
    data: result,
  })
}
