import type { Request, Response } from 'express'

import { studentLiveClassService } from '../services/student-live-class.service'
import { getStudentAttendanceOverview } from '../services/student-attendance.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { StudentSessionIdParam } from '../validators/student-live-class.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

export async function listLiveClasses(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const data = await studentLiveClassService.listUpcoming(user.id)
  sendSuccess(res, { data })
}

export async function getLiveClass(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentSessionIdParam
  const data = await studentLiveClassService.getSession(user.id, id)
  sendSuccess(res, { data })
}

export async function getJoinDetails(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as StudentSessionIdParam
  const data = await studentLiveClassService.getJoinDetails(user.id, id)
  sendSuccess(res, { data })
}

export async function getAttendanceOverview(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const data = await getStudentAttendanceOverview(user.id)
  sendSuccess(res, { data })
}
