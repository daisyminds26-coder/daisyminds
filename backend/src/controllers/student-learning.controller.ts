import type { Request, Response } from 'express'

import { studentLearningService } from '../services/student-learning.service'
import { sendSuccess } from '../utils/api-response'
import { ApiError } from '../utils/api-error'
import type {
  CourseProgressParam,
  LessonParam,
  UpdateLessonProgressInput,
} from '../validators/student-learning.validator'

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw ApiError.unauthorized('Authentication required')
  return req.user
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId } = req.validated?.params as CourseProgressParam
  const dto = await studentLearningService.getCourseProgress(user.id, courseId)
  sendSuccess(res, { data: dto })
}

export async function getLessonDetail(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId, lessonId } = req.validated?.params as LessonParam
  const dto = await studentLearningService.getLessonDetail(user.id, courseId, lessonId)
  sendSuccess(res, { data: dto })
}

export async function getLessonMediaUrl(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId, lessonId } = req.validated?.params as LessonParam
  const dto = await studentLearningService.getLessonMediaUrl(user.id, courseId, lessonId)
  sendSuccess(res, { data: dto })
}

export async function updateLessonProgress(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId, lessonId } = req.validated?.params as LessonParam
  const input = req.validated?.body as UpdateLessonProgressInput
  const dto = await studentLearningService.updateLessonProgress(user.id, courseId, lessonId, input)
  sendSuccess(res, { data: dto })
}

export async function markLessonComplete(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { courseId, lessonId } = req.validated?.params as LessonParam
  const dto = await studentLearningService.markLessonComplete(user.id, courseId, lessonId)
  sendSuccess(res, { message: 'Lesson marked complete', data: dto })
}
