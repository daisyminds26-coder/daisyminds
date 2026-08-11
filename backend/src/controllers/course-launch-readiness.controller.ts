import type { Request, Response } from 'express'

import { sendSuccess } from '../utils/api-response'
import { courseLaunchReadinessService } from '../services/course-launch-readiness.service'
import type { CourseIdParam } from '../validators/curriculum.validator'

export async function getLaunchReadiness(req: Request, res: Response): Promise<void> {
  const { courseId } = req.validated?.params as CourseIdParam
  const readiness = await courseLaunchReadinessService.checkLaunchReadiness(courseId)
  sendSuccess(res, { data: readiness })
}
