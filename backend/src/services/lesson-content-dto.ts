import type {
  ContentStatus,
  IDocumentAsset,
  IExternalLink,
  IVideoAsset,
  LessonDocument,
  LessonType,
  MediaAssetStatus,
} from '../models/lesson.model'

/**
 * Deliberately omits `provider`/`publicId`/`assetId`/`version` — those are
 * Cloudinary implementation details the admin frontend never needs. Preview/
 * delete/replace operations are always lesson-scoped (never take a
 * client-supplied `publicId`), so the client has no use for the raw asset
 * identifier and it is never sent (SECURITY.md §Secure Media Delivery).
 */
export interface VideoAssetDto {
  format: string
  durationSeconds: number | null
  width: number | null
  height: number | null
  bytes: number
  status: MediaAssetStatus
  uploadedAt: string
}

export interface DocumentAssetDto {
  format: string
  bytes: number
  originalFilename: string
  uploadedAt: string
}

export interface ExternalLinkDto {
  url: string
  label: string | null
  description: string | null
  openInNewTab: boolean
  /** Derived at read time for the admin "parsed-domain preview" UX requirement — never stored. */
  domain: string
}

export interface LessonContentDto {
  lessonId: string
  courseId: string
  lessonType: LessonType
  contentStatus: ContentStatus
  textContent: string | null
  videoAsset: VideoAssetDto | null
  documentAsset: DocumentAssetDto | null
  externalLink: ExternalLinkDto | null
}

function toVideoAssetDto(asset: IVideoAsset): VideoAssetDto {
  return {
    format: asset.format,
    durationSeconds: asset.durationSeconds,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    status: asset.status,
    uploadedAt: asset.uploadedAt.toISOString(),
  }
}

function toDocumentAssetDto(asset: IDocumentAsset): DocumentAssetDto {
  return {
    format: asset.format,
    bytes: asset.bytes,
    originalFilename: asset.originalFilename,
    uploadedAt: asset.uploadedAt.toISOString(),
  }
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function toExternalLinkDto(link: IExternalLink): ExternalLinkDto {
  return {
    url: link.url,
    label: link.label,
    description: link.description,
    openInNewTab: link.openInNewTab,
    domain: safeDomain(link.url),
  }
}

export function toLessonContentDto(lesson: LessonDocument): LessonContentDto {
  return {
    lessonId: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    lessonType: lesson.lessonType,
    contentStatus: lesson.contentStatus,
    textContent: lesson.textContent,
    videoAsset: lesson.videoAsset ? toVideoAssetDto(lesson.videoAsset) : null,
    documentAsset: lesson.documentAsset ? toDocumentAssetDto(lesson.documentAsset) : null,
    externalLink: lesson.externalLink ? toExternalLinkDto(lesson.externalLink) : null,
  }
}
