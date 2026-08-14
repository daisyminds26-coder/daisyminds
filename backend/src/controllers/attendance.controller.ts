import type { Request, Response } from 'express'

import { attendanceService } from '../services/attendance.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type { SessionIdParam } from '../validators/attendance.validator'
import type {
  BulkMarkAttendanceInput,
  ExportAttendanceQuery,
  ListAttendanceQuery,
  ReopenAttendanceInput,
} from '../validators/attendance.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function getSessionAttendance(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as SessionIdParam
  const dto = await attendanceService.getSessionRoster(id)
  sendSuccess(res, { data: dto })
}

export async function bulkMarkSessionAttendance(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as SessionIdParam
  const input = req.validated?.body as BulkMarkAttendanceInput
  const result = await attendanceService.bulkMarkAttendance(
    id,
    input.records,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { data: result })
}

export async function finalizeSessionAttendance(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as SessionIdParam
  const dto = await attendanceService.finalizeAttendance(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Attendance finalized', data: dto })
}

export async function reopenSessionAttendance(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as SessionIdParam
  const input = req.validated?.body as ReopenAttendanceInput
  const dto = await attendanceService.reopenAttendance(
    id,
    input.reason,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Attendance reopened', data: dto })
}

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListAttendanceQuery
  const { data, meta } = await attendanceService.listAttendanceReport(
    {
      batchId: query.batchId,
      courseId: query.courseId,
      studentId: query.studentId,
      sessionId: query.sessionId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    query.page,
    query.limit,
  )
  sendSuccess(res, { data, meta })
}

export async function exportAttendance(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ExportAttendanceQuery
  const csv = await attendanceService.exportAttendanceCsv({
    batchId: query.batchId,
    courseId: query.courseId,
    studentId: query.studentId,
    sessionId: query.sessionId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  })
  res.status(200).type('text/csv').attachment('attendance-export.csv').send(csv)
}
