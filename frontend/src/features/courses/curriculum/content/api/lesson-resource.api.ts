import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/lib/api-client'
import type {
  LessonResource,
  ReorderResourceItem,
  SignedDeliveryUrl,
  SignedUploadParams,
} from '@/features/courses/curriculum/content/types'

function base(courseId: string, moduleId: string, lessonId: string): string {
  return `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/resources`
}

export function getResourceUploadSignature(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`${base(courseId, moduleId, lessonId)}/signature`)
}

export interface ConfirmResourcePayload {
  publicId: string
  filename: string
  title: string
  description?: string
  isDownloadable?: boolean
}

export function verifyAndAddResource(
  courseId: string,
  moduleId: string,
  lessonId: string,
  payload: ConfirmResourcePayload,
): Promise<LessonResource> {
  return apiPost<LessonResource>(`${base(courseId, moduleId, lessonId)}/verify`, payload)
}

export function listResources(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonResource[]> {
  return apiGet<LessonResource[]>(base(courseId, moduleId, lessonId))
}

export interface UpdateResourceMetadataPayload {
  title?: string
  description?: string
  isDownloadable?: boolean
}

export function updateResourceMetadata(
  courseId: string,
  moduleId: string,
  lessonId: string,
  resourceId: string,
  payload: UpdateResourceMetadataPayload,
): Promise<LessonResource> {
  return apiPatch<LessonResource>(`${base(courseId, moduleId, lessonId)}/${resourceId}`, payload)
}

export function reorderResources(
  courseId: string,
  moduleId: string,
  lessonId: string,
  items: ReorderResourceItem[],
): Promise<LessonResource[]> {
  return apiPost<LessonResource[]>(`${base(courseId, moduleId, lessonId)}/reorder`, { items })
}

export function getResourceDeliveryUrl(
  courseId: string,
  moduleId: string,
  lessonId: string,
  resourceId: string,
): Promise<SignedDeliveryUrl> {
  return apiGet<SignedDeliveryUrl>(
    `${base(courseId, moduleId, lessonId)}/${resourceId}/delivery-url`,
  )
}

export function deleteResource(
  courseId: string,
  moduleId: string,
  lessonId: string,
  resourceId: string,
): Promise<null> {
  return apiDelete<null>(`${base(courseId, moduleId, lessonId)}/${resourceId}`)
}
