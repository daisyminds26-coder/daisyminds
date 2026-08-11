import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { lessonResourceService } from '../services/lesson-resource.service'
import type { RequestContext } from '../services/user-management.service'
import type { LessonIdParam } from '../validators/curriculum.validator'
import type {
  ConfirmResourceInput,
  ReorderResourcesInput,
  ResourceIdParam,
  UpdateResourceMetadataInput,
} from '../validators/lesson-resource.validator'

function getRequestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user
}

export async function getUploadSignature(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const params = await lessonResourceService.getUploadSignature(courseId, moduleId, lessonId)
  sendSuccess(res, { data: params })
}

export async function verifyAndAddResource(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as ConfirmResourceInput
  const dto = await lessonResourceService.verifyAndAddResource(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendCreated(res, { message: 'Resource added', data: dto })
}

export async function listResources(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dtos = await lessonResourceService.listResources(courseId, moduleId, lessonId)
  sendSuccess(res, { data: dtos })
}

export async function updateResourceMetadata(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId, resourceId } = req.validated?.params as ResourceIdParam
  const input = req.validated?.body as UpdateResourceMetadataInput
  const dto = await lessonResourceService.updateResourceMetadata(
    courseId,
    moduleId,
    lessonId,
    resourceId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Resource updated', data: dto })
}

export async function reorderResources(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as ReorderResourcesInput
  const dtos = await lessonResourceService.reorderResources(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Resources reordered', data: dtos })
}

export async function getDeliveryUrl(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId, resourceId } = req.validated?.params as ResourceIdParam
  const delivery = await lessonResourceService.getDeliveryUrl(
    courseId,
    moduleId,
    lessonId,
    resourceId,
  )
  sendSuccess(res, { data: delivery })
}

export async function deleteResource(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId, resourceId } = req.validated?.params as ResourceIdParam
  await lessonResourceService.deleteResource(
    courseId,
    moduleId,
    lessonId,
    resourceId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Resource deleted' })
}
