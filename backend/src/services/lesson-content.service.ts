import { env } from '../config/env'
import { ApiError } from '../utils/api-error'
import { sanitizeLessonHtml } from '../utils/html-sanitize'
import { computeContentStatus } from '../utils/lesson-content-status.util'
import { curriculumRepository } from '../repositories/curriculum.repository'
import {
  assertEditableCourse,
  assertLessonInModule,
  recordCurriculumAudit,
  requireLesson,
} from './curriculum-helpers'
import {
  ALLOWED_DOCUMENT_FORMATS,
  ALLOWED_VIDEO_FORMATS,
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { toLessonContentDto, type LessonContentDto } from './lesson-content-dto'
import type {
  ConfirmDocumentInput,
  UpdateExternalLinkInput,
  UpdateTextContentInput,
} from '../validators/lesson-content.validator'
import type { ContentStatus, LessonDocument } from '../models/lesson.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const MAX_VIDEO_BYTES = () => env.MAX_VIDEO_UPLOAD_MB * 1024 * 1024
const MAX_DOCUMENT_BYTES = () => env.MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024

function videoFolder(courseId: string, lessonId: string): string {
  return `daisy-minds/courses/${courseId}/lessons/${lessonId}/video`
}

function documentFolder(courseId: string, lessonId: string): string {
  return `daisy-minds/courses/${courseId}/lessons/${lessonId}/document`
}

async function requireLessonOfType(
  courseId: string,
  moduleId: string,
  lessonId: string,
  expectedType: LessonDocument['lessonType'],
): Promise<LessonDocument> {
  const lesson = await requireLesson(courseId, lessonId)
  assertLessonInModule(lesson, moduleId)
  if (lesson.lessonType !== expectedType) {
    throw ApiError.conflict(
      `This lesson's type is ${lesson.lessonType} — ${expectedType.toLowerCase()} content can only be set on a ${expectedType} lesson`,
    )
  }
  return lesson
}

/**
 * Persists a content-field patch, recomputes `contentStatus` from the
 * resulting document in the same write, records the primary audit event,
 * and — only when the computed status actually changed — records
 * `lesson.content.readiness_changed` too (minimum audit set, ARCHITECTURE.md
 * §21). One helper so every content-write path applies this identically.
 */
async function applyContentUpdate(
  lesson: LessonDocument,
  patch: Record<string, unknown>,
  courseId: string,
  moduleId: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  auditAction: string,
  auditMetadata: Record<string, unknown>,
): Promise<LessonDocument> {
  const merged = { ...lesson.toObject(), ...patch } as LessonDocument
  const contentStatus: ContentStatus = computeContentStatus(merged)
  const previousStatus = lesson.contentStatus

  const updated = await curriculumRepository.updateLessonById(lesson._id.toString(), {
    ...patch,
    contentStatus,
    updatedBy: actor.id,
  })
  if (!updated) throw ApiError.notFound('Lesson not found')

  await recordCurriculumAudit(courseId, auditAction, actor, context, {
    ...auditMetadata,
    lessonId: lesson._id.toString(),
    moduleId,
  })

  if (contentStatus !== previousStatus) {
    await recordCurriculumAudit(courseId, 'lesson.content.readiness_changed', actor, context, {
      lessonId: lesson._id.toString(),
      moduleId,
      from: previousStatus,
      to: contentStatus,
    })
  }

  return updated
}

export const lessonContentService = {
  async getContent(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<LessonContentDto> {
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)
    return toLessonContentDto(lesson)
  },

  async updateTextContent(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: UpdateTextContentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'TEXT')

    const sanitized = sanitizeLessonHtml(input.textContent)
    const updated = await applyContentUpdate(
      lesson,
      { textContent: sanitized },
      courseId,
      moduleId,
      actor,
      context,
      'lesson.content.text_updated',
      {},
    )
    return toLessonContentDto(updated)
  },

  async updateExternalLink(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: UpdateExternalLinkInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'EXTERNAL_LINK')

    const externalLink = {
      url: input.url,
      label: input.label ?? null,
      description: input.description ?? null,
      openInNewTab: input.openInNewTab,
    }
    const updated = await applyContentUpdate(
      lesson,
      { externalLink },
      courseId,
      moduleId,
      actor,
      context,
      'lesson.content.external_link_updated',
      {},
    )
    return toLessonContentDto(updated)
  },

  // ---- Video --------------------------------------------------------------

  async getVideoUploadSignature(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<SignedUploadParams> {
    await requireLessonOfType(courseId, moduleId, lessonId, 'VIDEO')
    const folder = videoFolder(courseId, lessonId)
    const publicId = `${folder}/video-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId, {
      resourceType: 'video',
      type: 'authenticated',
      allowedFormats: ALLOWED_VIDEO_FORMATS,
      maxFileSize: MAX_VIDEO_BYTES(),
    })
  },

  async verifyVideo(
    courseId: string,
    moduleId: string,
    lessonId: string,
    publicId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'VIDEO')

    const folder = videoFolder(courseId, lessonId)
    const asset = await verifyUploadedAsset(publicId, folder, {
      resourceType: 'video',
      type: 'authenticated',
      maxFileSize: MAX_VIDEO_BYTES(),
    })

    const previousPublicId = lesson.videoAsset?.publicId ?? null
    const videoAsset = {
      provider: 'cloudinary' as const,
      publicId,
      assetId: asset.assetId,
      resourceType: 'video' as const,
      format: asset.format,
      durationSeconds: asset.durationSeconds,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      version: asset.version,
      status: 'READY' as const,
      uploadedAt: new Date(),
    }

    const updated = await applyContentUpdate(
      lesson,
      { videoAsset },
      courseId,
      moduleId,
      actor,
      context,
      previousPublicId ? 'lesson.video.replaced' : 'lesson.video.verified',
      { format: asset.format, bytes: asset.bytes, durationSeconds: asset.durationSeconds },
    )

    if (previousPublicId && previousPublicId !== publicId) {
      await deleteAsset(previousPublicId, 'video', 'authenticated')
    }

    return toLessonContentDto(updated)
  },

  async removeVideo(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'VIDEO')
    if (!lesson.videoAsset) throw ApiError.unprocessable('This lesson has no video to remove')

    const publicId = lesson.videoAsset.publicId
    const updated = await applyContentUpdate(
      lesson,
      { videoAsset: null },
      courseId,
      moduleId,
      actor,
      context,
      'lesson.video.removed',
      {},
    )

    await deleteAsset(publicId, 'video', 'authenticated')
    return toLessonContentDto(updated)
  },

  async getVideoPreviewUrl(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'VIDEO')
    if (!lesson.videoAsset) throw ApiError.unprocessable('This lesson has no video to preview')
    if (lesson.videoAsset.status !== 'READY') {
      throw ApiError.conflict('This video is not ready for preview yet')
    }

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(lesson.videoAsset.publicId, {
      resourceType: 'video',
      format: lesson.videoAsset.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },

  // ---- Document -------------------------------------------------------------

  async getDocumentUploadSignature(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<SignedUploadParams> {
    await requireLessonOfType(courseId, moduleId, lessonId, 'DOCUMENT')
    const folder = documentFolder(courseId, lessonId)
    const publicId = `${folder}/document-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId, {
      resourceType: 'raw',
      type: 'authenticated',
      allowedFormats: ALLOWED_DOCUMENT_FORMATS,
      maxFileSize: MAX_DOCUMENT_BYTES(),
    })
  },

  async verifyDocument(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: ConfirmDocumentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'DOCUMENT')

    const folder = documentFolder(courseId, lessonId)
    const asset = await verifyUploadedAsset(input.publicId, folder, {
      resourceType: 'raw',
      type: 'authenticated',
      maxFileSize: MAX_DOCUMENT_BYTES(),
    })

    const previousPublicId = lesson.documentAsset?.publicId ?? null
    const documentAsset = {
      provider: 'cloudinary' as const,
      publicId: input.publicId,
      assetId: asset.assetId,
      format: asset.format,
      bytes: asset.bytes,
      version: asset.version,
      originalFilename: input.originalFilename,
      uploadedAt: new Date(),
    }

    const updated = await applyContentUpdate(
      lesson,
      { documentAsset },
      courseId,
      moduleId,
      actor,
      context,
      previousPublicId ? 'lesson.document.replaced' : 'lesson.document.verified',
      { format: asset.format, bytes: asset.bytes },
    )

    if (previousPublicId && previousPublicId !== input.publicId) {
      await deleteAsset(previousPublicId, 'raw', 'authenticated')
    }

    return toLessonContentDto(updated)
  },

  async removeDocument(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonContentDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'DOCUMENT')
    if (!lesson.documentAsset) throw ApiError.unprocessable('This lesson has no document to remove')

    const publicId = lesson.documentAsset.publicId
    const updated = await applyContentUpdate(
      lesson,
      { documentAsset: null },
      courseId,
      moduleId,
      actor,
      context,
      'lesson.document.removed',
      {},
    )

    await deleteAsset(publicId, 'raw', 'authenticated')
    return toLessonContentDto(updated)
  },

  async getDocumentPreviewUrl(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const lesson = await requireLessonOfType(courseId, moduleId, lessonId, 'DOCUMENT')
    if (!lesson.documentAsset)
      throw ApiError.unprocessable('This lesson has no document to preview')

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(lesson.documentAsset.publicId, {
      resourceType: 'raw',
      format: lesson.documentAsset.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },

  // ---- Readiness --------------------------------------------------------

  async checkContentReadiness(
    courseId: string,
    moduleId: string,
    lessonId: string,
  ): Promise<{ contentStatus: ContentStatus; ready: boolean; blockers: string[] }> {
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    const contentStatus = computeContentStatus(lesson)
    if (contentStatus !== lesson.contentStatus) {
      await curriculumRepository.updateLessonById(lessonId, { contentStatus })
    }

    const blockers: string[] = []
    switch (contentStatus) {
      case 'EMPTY':
        blockers.push('No content has been added yet')
        break
      case 'INCOMPLETE':
        blockers.push('Content has been started but is still empty')
        break
      case 'PROCESSING':
        blockers.push('The video is still processing')
        break
      case 'ERROR':
        blockers.push('The last upload failed — remove it and try again')
        break
      case 'NOT_CONFIGURED':
        blockers.push('This lesson type does not support content yet (coming in a future phase)')
        break
      case 'READY':
        break
    }

    return { contentStatus, ready: contentStatus === 'READY', blockers }
  },
}
