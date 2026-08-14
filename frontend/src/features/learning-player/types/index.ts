import type {
  EnrollmentAccessState,
  LessonProgressStatus,
  LessonType,
  MediaAssetStatus,
} from '@/features/student-portal/types'

export interface LessonProgress {
  status: LessonProgressStatus
  videoPositionSeconds: number
  startedAt: string | null
  lastAccessedAt: string | null
  completedAt: string | null
}

export interface LessonResourceSummary {
  id: string
  title: string
  resourceType: string
  format: string
  bytes: number
  isDownloadable: boolean
}

export interface LessonVideoInfo {
  status: MediaAssetStatus
  durationSeconds: number | null
}

export interface LessonDocumentInfo {
  filename: string
  format: string
  bytes: number
}

export interface LessonExternalLinkInfo {
  url: string
  label: string | null
  description: string | null
  openInNewTab: boolean
}

export interface LessonNavigation {
  previousLessonId: string | null
  nextLessonId: string | null
}

export interface LessonDetail {
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
  progress: LessonProgress | null
  navigation: LessonNavigation
  textContent: string | null
  video: LessonVideoInfo | null
  document: LessonDocumentInfo | null
  externalLink: LessonExternalLinkInfo | null
  resources: LessonResourceSummary[]
}
