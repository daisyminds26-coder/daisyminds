import { apiDelete, apiGet, apiPost, apiPut } from '@/shared/lib/api-client'
import type {
  ContentReadiness,
  CourseLaunchReadiness,
  LessonContent,
  SignedDeliveryUrl,
  SignedUploadParams,
} from '@/features/courses/curriculum/content/types'

/** Mirrors `backend/src/routes/lesson-content.routes.ts` exactly — no component calls `apiGet`/`apiPost`/etc. directly. */

function base(courseId: string, moduleId: string, lessonId: string): string {
  return `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`
}

export function getLessonContent(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonContent> {
  return apiGet<LessonContent>(`${base(courseId, moduleId, lessonId)}/content`)
}

export function checkContentReadiness(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<ContentReadiness> {
  return apiPost<ContentReadiness>(`${base(courseId, moduleId, lessonId)}/content/readiness-check`)
}

export function updateTextContent(
  courseId: string,
  moduleId: string,
  lessonId: string,
  textContent: string,
): Promise<LessonContent> {
  return apiPut<LessonContent>(`${base(courseId, moduleId, lessonId)}/content/text`, {
    textContent,
  })
}

export interface ExternalLinkPayload {
  url: string
  label?: string
  description?: string
  openInNewTab?: boolean
}

export function updateExternalLink(
  courseId: string,
  moduleId: string,
  lessonId: string,
  payload: ExternalLinkPayload,
): Promise<LessonContent> {
  return apiPut<LessonContent>(
    `${base(courseId, moduleId, lessonId)}/content/external-link`,
    payload,
  )
}

export function getVideoUploadSignature(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(
    `${base(courseId, moduleId, lessonId)}/content/video/signature`,
  )
}

export function verifyVideo(
  courseId: string,
  moduleId: string,
  lessonId: string,
  publicId: string,
): Promise<LessonContent> {
  return apiPost<LessonContent>(`${base(courseId, moduleId, lessonId)}/content/video/verify`, {
    publicId,
  })
}

export function getVideoPreviewUrl(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<SignedDeliveryUrl> {
  return apiGet<SignedDeliveryUrl>(
    `${base(courseId, moduleId, lessonId)}/content/video/preview-url`,
  )
}

export function removeVideo(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonContent> {
  return apiDelete<LessonContent>(`${base(courseId, moduleId, lessonId)}/content/video`)
}

export function getDocumentUploadSignature(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(
    `${base(courseId, moduleId, lessonId)}/content/document/signature`,
  )
}

export function verifyDocument(
  courseId: string,
  moduleId: string,
  lessonId: string,
  publicId: string,
  originalFilename: string,
): Promise<LessonContent> {
  return apiPost<LessonContent>(`${base(courseId, moduleId, lessonId)}/content/document/verify`, {
    publicId,
    originalFilename,
  })
}

export function getDocumentPreviewUrl(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<SignedDeliveryUrl> {
  return apiGet<SignedDeliveryUrl>(
    `${base(courseId, moduleId, lessonId)}/content/document/preview-url`,
  )
}

export function removeDocument(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonContent> {
  return apiDelete<LessonContent>(`${base(courseId, moduleId, lessonId)}/content/document`)
}

export function getCourseLaunchReadiness(courseId: string): Promise<CourseLaunchReadiness> {
  return apiGet<CourseLaunchReadiness>(`/courses/${courseId}/launch-readiness`)
}
