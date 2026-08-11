import type { LessonResourceDocument, LessonResourceType } from '../models/lesson-resource.model'

/** Omits `provider`/`publicId`/`assetId` for the same reason as `VideoAssetDto` — delivery/delete are always id-scoped, never take a client-supplied Cloudinary identifier. */
export interface LessonResourceDto {
  id: string
  lessonId: string
  courseId: string
  title: string
  description: string | null
  resourceType: LessonResourceType
  filename: string
  format: string
  mimeType: string
  bytes: number
  sortOrder: number
  isDownloadable: boolean
  createdAt: string
  updatedAt: string
}

export function toLessonResourceDto(resource: LessonResourceDocument): LessonResourceDto {
  return {
    id: resource._id.toString(),
    lessonId: resource.lessonId.toString(),
    courseId: resource.courseId.toString(),
    title: resource.title,
    description: resource.description,
    resourceType: resource.resourceType,
    filename: resource.filename,
    format: resource.format,
    mimeType: resource.mimeType,
    bytes: resource.bytes,
    sortOrder: resource.sortOrder,
    isDownloadable: resource.isDownloadable,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  }
}
