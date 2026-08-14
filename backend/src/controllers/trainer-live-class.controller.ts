import type { Request, Response } from 'express'

import { trainerLiveClassService } from '../services/trainer-live-class.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { BulkMarkAttendanceInput } from '../validators/attendance.validator'
import type {
  TrainerListLiveClassesQuery,
  TrainerSessionIdParam,
} from '../validators/trainer-live-class.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function listMySessions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const query = req.validated?.query as TrainerListLiveClassesQuery
  const data = await trainerLiveClassService.listMySessions(user.id, query)
  sendSuccess(res, { data })
}

export async function getMySession(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as TrainerSessionIdParam
  const data = await trainerLiveClassService.getMySession(user.id, id)
  sendSuccess(res, { data })
}

export async function startMySession(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as TrainerSessionIdParam
  const data = await trainerLiveClassService.startMySession(
    user.id,
    id,
    user,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Session started', data })
}

export async function completeMySession(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as TrainerSessionIdParam
  const data = await trainerLiveClassService.completeMySession(
    user.id,
    id,
    user,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Session marked complete', data })
}

export async function getMySessionAttendance(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as TrainerSessionIdParam
  const data = await trainerLiveClassService.getMySessionAttendance(user.id, id)
  sendSuccess(res, { data })
}

export async function markMySessionAttendance(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as TrainerSessionIdParam
  const input = req.validated?.body as BulkMarkAttendanceInput
  const data = await trainerLiveClassService.markMySessionAttendance(
    user.id,
    id,
    input.records,
    user,
    getRequestContext(req),
  )
  sendSuccess(res, { data })
}
