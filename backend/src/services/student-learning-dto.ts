import type { EnrollmentAccessState } from './enrollment-access.service'
import type { LessonProgressDocument, LessonProgressStatus } from '../models/lesson-progress.model'
import type { LessonDocument, LessonType, MediaAssetStatus } from '../models/lesson.model'
import type { CourseModuleDocument } from '../models/course-module.model'

export interface StudentLessonProgressDto {
  status: LessonProgressStatus
  videoPositionSeconds: number
  startedAt: string | null
  lastAccessedAt: string | null
  completedAt: string | null
}

export interface StudentLessonResourceSummaryDto {
  id: string
  title: string
  resourceType: string
  format: string
  bytes: number
  isDownloadable: boolean
}

export interface StudentLessonVideoDto {
  status: MediaAssetStatus
  durationSeconds: number | null
}

export interface StudentLessonDocumentDto {
  filename: string
  format: string
  bytes: number
}

export interface StudentLessonExternalLinkDto {
  url: string
  label: string | null
  description: string | null
  openInNewTab: boolean
}

export interface StudentLessonNavigationDto {
  previousLessonId: string | null
  nextLessonId: string | null
}

export interface StudentLessonDetailDto {
  id: string
  courseId: string
  moduleId: string
  moduleTitle: string
  title: string
  shortDescription: string
  lessonType: LessonType
  order: number
  estimatedDurationMinutes: number | null
  isMandatory: boolean
  isPreview: boolean
  accessState: EnrollmentAccessState
  hasAccess: boolean
  locked: boolean
  lockReason: string | null
  progress: StudentLessonProgressDto | null
  navigation: StudentLessonNavigationDto
  /** Populated only when `!locked && hasAccess` — never leaked to a suspended/locked view. */
  textContent: string | null
  video: StudentLessonVideoDto | null
  document: StudentLessonDocumentDto | null
  externalLink: StudentLessonExternalLinkDto | null
  resources: StudentLessonResourceSummaryDto[]
}

export function toLessonProgressDto(progress: LessonProgressDocument): StudentLessonProgressDto
export function toLessonProgressDto(progress: null): null
export function toLessonProgressDto(
  progress: LessonProgressDocument | null,
): StudentLessonProgressDto | null
export function toLessonProgressDto(
  progress: LessonProgressDocument | null,
): StudentLessonProgressDto | null {
  if (!progress) return null
  return {
    status: progress.status,
    videoPositionSeconds: progress.videoPositionSeconds,
    startedAt: progress.startedAt ? progress.startedAt.toISOString() : null,
    lastAccessedAt: progress.lastAccessedAt ? progress.lastAccessedAt.toISOString() : null,
    completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
  }
}

export function buildLessonDetailDto(input: {
  lesson: LessonDocument
  courseModule: CourseModuleDocument
  accessState: EnrollmentAccessState
  hasAccess: boolean
  locked: boolean
  lockReason: string | null
  progress: LessonProgressDocument | null
  navigation: StudentLessonNavigationDto
  resources: StudentLessonResourceSummaryDto[]
}): StudentLessonDetailDto {
  const { lesson, courseModule, hasAccess, locked } = input
  const revealContent = hasAccess && !locked

  return {
    id: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    moduleId: courseModule._id.toString(),
    moduleTitle: courseModule.title,
    title: lesson.title,
    shortDescription: lesson.shortDescription,
    lessonType: lesson.lessonType,
    order: lesson.order,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    isMandatory: lesson.isMandatory,
    isPreview: lesson.isPreview,
    accessState: input.accessState,
    hasAccess,
    locked,
    lockReason: input.lockReason,
    progress: toLessonProgressDto(input.progress),
    navigation: input.navigation,
    textContent: revealContent ? lesson.textContent : null,
    video:
      revealContent && lesson.videoAsset
        ? { status: lesson.videoAsset.status, durationSeconds: lesson.videoAsset.durationSeconds }
        : null,
    document:
      revealContent && lesson.documentAsset
        ? {
            filename: lesson.documentAsset.originalFilename,
            format: lesson.documentAsset.format,
            bytes: lesson.documentAsset.bytes,
          }
        : null,
    externalLink:
      revealContent && lesson.externalLink
        ? {
            url: lesson.externalLink.url,
            label: lesson.externalLink.label,
            description: lesson.externalLink.description,
            openInNewTab: lesson.externalLink.openInNewTab,
          }
        : null,
    resources: revealContent ? input.resources : [],
  }
}
