import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { courseManagementService } from '../services/course-management.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  ConfirmMediaInput,
  CourseBulkActionInput,
  CourseIdParam,
  CreateCourseInput,
  ExportCoursesQuery,
  ListCoursesQuery,
  PaginationQuery,
  UpdateCourseInput,
} from '../validators/course.validator'

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

export async function listCourses(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListCoursesQuery
  const { dtos, total } = await courseManagementService.listCourses(
    {
      status: query.status,
      visibility: query.visibility,
      level: query.level,
      deliveryMode: query.deliveryMode,
      pricingType: query.pricingType,
      category: query.category,
      language: query.language,
      isFeatured: query.isFeatured,
      certificateEnabled: query.certificateEnabled,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      publishedFrom: query.publishedFrom,
      publishedTo: query.publishedTo,
      search: query.search,
      includeDeleted: query.includeDeleted,
    },
    {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    },
  )

  sendSuccess(res, {
    data: dtos,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  })
}

export async function exportCourses(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const query = req.validated?.query as ExportCoursesQuery
  const csv = await courseManagementService.exportCoursesCsv(
    {
      status: query.status,
      visibility: query.visibility,
      level: query.level,
      deliveryMode: query.deliveryMode,
      pricingType: query.pricingType,
      category: query.category,
      language: query.language,
      isFeatured: query.isFeatured,
      certificateEnabled: query.certificateEnabled,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      publishedFrom: query.publishedFrom,
      publishedTo: query.publishedTo,
      search: query.search,
      includeDeleted: query.includeDeleted,
    },
    actor,
    getRequestContext(req),
  )

  res.status(200).type('text/csv').attachment('courses-export.csv').send(csv)
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.getCourseById(id)
  sendSuccess(res, { data: dto })
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const input = req.validated?.body as CreateCourseInput
  const dto = await courseManagementService.createCourse(input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Course created', data: dto })
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const input = req.validated?.body as UpdateCourseInput
  const dto = await courseManagementService.updateCourse(id, input, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course updated', data: dto })
}

export async function checkReadiness(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as CourseIdParam
  const readiness = await courseManagementService.getReadiness(id)
  sendSuccess(res, { data: readiness })
}

export async function publishCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.publishCourse(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course published', data: dto })
}

export async function unpublishCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.unpublishCourse(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course moved back to draft', data: dto })
}

export async function archiveCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.archiveCourse(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course archived', data: dto })
}

export async function restoreCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.restoreCourse(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course restored', data: dto })
}

export async function softDeleteCourse(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  await courseManagementService.softDeleteCourse(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Course deleted' })
}

export async function bulkAction(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { action, courseIds } = req.validated?.body as CourseBulkActionInput
  const result = await courseManagementService.bulkAction(
    action,
    courseIds,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Bulk action completed', data: result })
}

export async function getAuditTimeline(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as CourseIdParam
  const { page, limit } = req.validated?.query as PaginationQuery
  const { entries, total } = await courseManagementService.getAuditTimeline(id, page, limit)

  sendSuccess(res, {
    data: entries,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function getThumbnailUploadSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as CourseIdParam
  const params = await courseManagementService.getThumbnailUploadSignature(id)
  sendSuccess(res, { data: params })
}

export async function verifyThumbnail(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const { publicId } = req.validated?.body as ConfirmMediaInput
  const dto = await courseManagementService.confirmThumbnail(
    id,
    publicId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Thumbnail updated', data: dto })
}

export async function removeThumbnail(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.removeThumbnail(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Thumbnail removed', data: dto })
}

export async function getBannerUploadSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as CourseIdParam
  const params = await courseManagementService.getBannerUploadSignature(id)
  sendSuccess(res, { data: params })
}

export async function verifyBanner(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const { publicId } = req.validated?.body as ConfirmMediaInput
  const dto = await courseManagementService.confirmBanner(
    id,
    publicId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Banner updated', data: dto })
}

export async function removeBanner(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { id } = req.validated?.params as CourseIdParam
  const dto = await courseManagementService.removeBanner(id, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Banner removed', data: dto })
}
