import type { Request, Response } from 'express'

import { studentPortalService } from '../services/student-portal.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  EnrollmentIdParam,
  ResourceIdParam,
  StudentCourseIdParam,
  UpdateOwnProfileInput,
} from '../validators/student-portal.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.getDashboard(user.id)
  sendSuccess(res, { data: dto })
}

export async function listEnrollments(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.listEnrollments(user.id)
  sendSuccess(res, { data: dto })
}

export async function getEnrollment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { id } = req.validated?.params as EnrollmentIdParam
  const dto = await studentPortalService.getEnrollment(user.id, id)
  sendSuccess(res, { data: dto })
}

export async function listCourses(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.listCourses(user.id)
  sendSuccess(res, { data: dto })
}

export async function getCourseOverview(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId } = req.validated?.params as StudentCourseIdParam
  const dto = await studentPortalService.getCourseOverview(user.id, courseId)
  sendSuccess(res, { data: dto })
}

export async function listSchedule(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.listSchedule(user.id)
  sendSuccess(res, { data: dto })
}

export async function listResources(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.listResources(user.id)
  sendSuccess(res, { data: dto })
}

export async function getResourceDeliveryUrl(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { resourceId } = req.validated?.params as ResourceIdParam
  const dto = await studentPortalService.getResourceDeliveryUrl(user.id, resourceId)
  sendSuccess(res, { data: dto })
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const dto = await studentPortalService.getProfile(user.id)
  sendSuccess(res, { data: dto })
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const input = req.validated?.body as UpdateOwnProfileInput
  const dto = await studentPortalService.updateProfile(user.id, input, getRequestContext(req))
  sendSuccess(res, { message: 'Profile updated', data: dto })
}
