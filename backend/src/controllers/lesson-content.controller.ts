import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendSuccess } from '../utils/api-response'
import { lessonContentService } from '../services/lesson-content.service'
import type { RequestContext } from '../services/user-management.service'
import type { LessonIdParam } from '../validators/curriculum.validator'
import type {
  ConfirmDocumentInput,
  ConfirmMediaAssetInput,
  UpdateExternalLinkInput,
  UpdateTextContentInput,
} from '../validators/lesson-content.validator'

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

export async function getContent(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await lessonContentService.getContent(courseId, moduleId, lessonId)
  sendSuccess(res, { data: dto })
}

export async function updateTextContent(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as UpdateTextContentInput
  const dto = await lessonContentService.updateTextContent(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Text content updated', data: dto })
}

export async function updateExternalLink(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as UpdateExternalLinkInput
  const dto = await lessonContentService.updateExternalLink(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'External link updated', data: dto })
}

export async function getVideoUploadSignature(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const params = await lessonContentService.getVideoUploadSignature(courseId, moduleId, lessonId)
  sendSuccess(res, { data: params })
}

export async function verifyVideo(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const { publicId } = req.validated?.body as ConfirmMediaAssetInput
  const dto = await lessonContentService.verifyVideo(
    courseId,
    moduleId,
    lessonId,
    publicId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Video updated', data: dto })
}

export async function removeVideo(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await lessonContentService.removeVideo(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Video removed', data: dto })
}

export async function getVideoPreviewUrl(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const preview = await lessonContentService.getVideoPreviewUrl(courseId, moduleId, lessonId)
  sendSuccess(res, { data: preview })
}

export async function getDocumentUploadSignature(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const params = await lessonContentService.getDocumentUploadSignature(courseId, moduleId, lessonId)
  sendSuccess(res, { data: params })
}

export async function verifyDocument(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as ConfirmDocumentInput
  const dto = await lessonContentService.verifyDocument(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Document updated', data: dto })
}

export async function removeDocument(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await lessonContentService.removeDocument(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Document removed', data: dto })
}

export async function getDocumentPreviewUrl(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const preview = await lessonContentService.getDocumentPreviewUrl(courseId, moduleId, lessonId)
  sendSuccess(res, { data: preview })
}

export async function checkContentReadiness(req: Request, res: Response): Promise<void> {
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const readiness = await lessonContentService.checkContentReadiness(courseId, moduleId, lessonId)
  sendSuccess(res, { data: readiness })
}
