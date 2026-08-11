import type { ContentStatus, LessonType } from '@/features/courses/curriculum/types'

export type { ContentStatus, LessonType }

export type MediaAssetStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

export interface VideoAsset {
  format: string
  durationSeconds: number | null
  width: number | null
  height: number | null
  bytes: number
  status: MediaAssetStatus
  uploadedAt: string
}

export interface DocumentAsset {
  format: string
  bytes: number
  originalFilename: string
  uploadedAt: string
}

export interface ExternalLinkContent {
  url: string
  label: string | null
  description: string | null
  openInNewTab: boolean
  domain: string
}

export interface LessonContent {
  lessonId: string
  courseId: string
  lessonType: LessonType
  contentStatus: ContentStatus
  textContent: string | null
  videoAsset: VideoAsset | null
  documentAsset: DocumentAsset | null
  externalLink: ExternalLinkContent | null
}

/** Cloudinary's own resource-type taxonomy — used only to route the direct-upload POST to the right endpoint (`image`/`video`/`raw`). */
export type CloudinaryResourceType = 'image' | 'video' | 'raw'
export type CloudinaryDeliveryType = 'upload' | 'authenticated'

export interface SignedUploadParams {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  resourceType: CloudinaryResourceType
  type: CloudinaryDeliveryType
  allowedFormats: string[]
  maxFileSize: number
}

export interface SignedDeliveryUrl {
  url: string
  expiresInSeconds: number
}

export interface ContentReadiness {
  contentStatus: ContentStatus
  ready: boolean
  blockers: string[]
}

export const LESSON_RESOURCE_TYPES = [
  'PDF',
  'DOCUMENT',
  'SLIDES',
  'ARCHIVE',
  'IMAGE',
  'OTHER',
] as const
export type LessonResourceType = (typeof LESSON_RESOURCE_TYPES)[number]

export interface LessonResource {
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

export interface LaunchReadinessBlocker {
  field: string
  message: string
}

export interface LaunchReadinessSummary {
  publishedModuleCount: number
  publishedLessonCount: number
  publishedLessonsWithReadyContent: number
  publishedLessonsBlockingLaunch: number
}

export interface CourseLaunchReadiness {
  ready: boolean
  courseMetadataReady: boolean
  curriculumStructureReady: boolean
  contentReady: boolean
  blockers: LaunchReadinessBlocker[]
  summary: LaunchReadinessSummary
}

export interface ReorderResourceItem {
  id: string
  order: number
}
