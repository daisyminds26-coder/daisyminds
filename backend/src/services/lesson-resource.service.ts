import { Types } from 'mongoose'

import { env } from '../config/env'
import { ApiError } from '../utils/api-error'
import { withTransaction } from '../utils/transaction'
import { findSetMismatch, normalizeOrders } from '../utils/curriculum-order.util'
import { resolveMimeType, resolveResourceType } from '../utils/lesson-resource-format.util'
import { lessonResourceRepository } from '../repositories/lesson-resource.repository'
import {
  assertEditableCourse,
  assertLessonInModule,
  recordCurriculumAudit,
  requireLesson,
} from './curriculum-helpers'
import {
  ALLOWED_RESOURCE_FORMATS,
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { toLessonResourceDto, type LessonResourceDto } from './lesson-resource-dto'
import type {
  ConfirmResourceInput,
  ReorderResourcesInput,
  UpdateResourceMetadataInput,
} from '../validators/lesson-resource.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const MAX_RESOURCE_BYTES = () => env.MAX_RESOURCE_UPLOAD_MB * 1024 * 1024

function resourceFolder(courseId: string, lessonId: string): string {
  return `daisy-minds/courses/${courseId}/lessons/${lessonId}/resources`
}

export const lessonResourceService = {
  async getUploadSignature(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<SignedUploadParams> {
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const count = await lessonResourceRepository.countByLesson(lessonId)
    if (count >= env.MAX_RESOURCES_PER_LESSON) {
      throw ApiError.unprocessable(
        'This lesson already has the maximum number of resources allowed',
      )
    }

    const folder = resourceFolder(courseId, lessonId)
    const publicId = `${folder}/resource-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId, {
      resourceType: 'raw',
      type: 'authenticated',
      allowedFormats: ALLOWED_RESOURCE_FORMATS,
      maxFileSize: MAX_RESOURCE_BYTES(),
    })
  },

  async verifyAndAddResource(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: ConfirmResourceInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonResourceDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const count = await lessonResourceRepository.countByLesson(lessonId)
    if (count >= env.MAX_RESOURCES_PER_LESSON) {
      throw ApiError.unprocessable(
        'This lesson already has the maximum number of resources allowed',
      )
    }

    const folder = resourceFolder(courseId, lessonId)
    const asset = await verifyUploadedAsset(input.publicId, folder, {
      resourceType: 'raw',
      type: 'authenticated',
      maxFileSize: MAX_RESOURCE_BYTES(),
    })

    const resourceType = resolveResourceType(asset.format)
    const sortOrder = await lessonResourceRepository.nextSortOrder(lessonId)

    const resource = await lessonResourceRepository.create({
      lessonId: lesson._id,
      courseId: lesson.courseId,
      title: input.title,
      description: input.description ?? null,
      resourceType,
      provider: 'cloudinary',
      publicId: input.publicId,
      assetId: asset.assetId,
      filename: input.filename,
      format: asset.format,
      mimeType: resolveMimeType(asset.format),
      bytes: asset.bytes,
      sortOrder,
      isDownloadable: input.isDownloadable,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await recordCurriculumAudit(courseId, 'lesson.resource.added', actor, context, {
      lessonId,
      moduleId,
      resourceId: resource._id.toString(),
      resourceType,
      format: asset.format,
      bytes: asset.bytes,
    })

    return toLessonResourceDto(resource)
  },

  async listResources(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<LessonResourceDto[]> {
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const resources = await lessonResourceRepository.findByLesson(lessonId)
    return resources.map(toLessonResourceDto)
  },

  async updateResourceMetadata(
    courseId: string,
    moduleId: string,
    lessonId: string,
    resourceId: string,
    input: UpdateResourceMetadataInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonResourceDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const resource = await lessonResourceRepository.findById(lessonId, resourceId)
    if (!resource) throw ApiError.notFound('Resource not found')

    const updated = await lessonResourceRepository.updateById(resourceId, {
      ...input,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Resource not found')

    await recordCurriculumAudit(courseId, 'lesson.resource.updated', actor, context, {
      lessonId,
      moduleId,
      resourceId,
    })

    return toLessonResourceDto(updated)
  },

  async reorderResources(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: ReorderResourcesInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonResourceDto[]> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const existing = await lessonResourceRepository.findByLesson(lessonId)
    const existingIds = existing.map((resource) => resource._id.toString())

    const { missingIds, unknownIds } = findSetMismatch(existingIds, input.items)
    if (missingIds.length > 0 || unknownIds.length > 0) {
      throw ApiError.badRequest('Reorder payload must include exactly the current resources', [
        { field: 'items', message: 'Reorder payload must include exactly the current resources' },
      ])
    }

    const updates = normalizeOrders(input.items)
    await withTransaction((session) => lessonResourceRepository.bulkUpdateOrders(updates, session))

    await recordCurriculumAudit(courseId, 'lesson.resource.reordered', actor, context, {
      lessonId,
      moduleId,
      resourceIds: updates.map((item) => item.id),
    })

    const reordered = await lessonResourceRepository.findByLesson(lessonId)
    return reordered.map(toLessonResourceDto)
  },

  async getDeliveryUrl(
    courseId: string,
    moduleId: string,
    lessonId: string,
    resourceId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const resource = await lessonResourceRepository.findById(lessonId, resourceId)
    if (!resource) throw ApiError.notFound('Resource not found')

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(resource.publicId, {
      resourceType: 'raw',
      format: resource.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },

  async deleteResource(
    courseId: string,
    moduleId: string,
    lessonId: string,
    resourceId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const resource = await lessonResourceRepository.findById(lessonId, resourceId)
    if (!resource) throw ApiError.notFound('Resource not found')

    await lessonResourceRepository.updateById(resourceId, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: actor.id,
    })
    await deleteAsset(resource.publicId, 'raw', 'authenticated')

    await recordCurriculumAudit(courseId, 'lesson.resource.removed', actor, context, {
      lessonId,
      moduleId,
      resourceId,
    })
  },
}
