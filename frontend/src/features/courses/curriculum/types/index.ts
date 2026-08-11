import type { CourseStatus } from '@/features/courses/types'

/** Reused directly — modules/lessons share the exact same DRAFT/PUBLISHED/ARCHIVED lifecycle courses use (backend: shared `ApprovalStatus` enum). */
export type CurriculumItemStatus = CourseStatus

export const CONTENT_STATUSES = [
  'EMPTY',
  'INCOMPLETE',
  'READY',
  'PROCESSING',
  'ERROR',
  'NOT_CONFIGURED',
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const LESSON_TYPES = [
  'VIDEO',
  'TEXT',
  'DOCUMENT',
  'LIVE_CLASS',
  'QUIZ',
  'ASSIGNMENT',
  'EXTERNAL_LINK',
] as const
export type LessonType = (typeof LESSON_TYPES)[number]

export interface CurriculumModule {
  id: string
  courseId: string
  title: string
  description: string
  order: number
  status: CurriculumItemStatus
  estimatedDurationMinutes: number | null
  createdAt: string
  updatedAt: string
}

export interface CurriculumLesson {
  id: string
  courseId: string
  courseModuleId: string
  title: string
  shortDescription: string
  order: number
  lessonType: LessonType
  status: CurriculumItemStatus
  estimatedDurationMinutes: number | null
  isPreview: boolean
  isMandatory: boolean
  prerequisiteLessonIds: string[]
  /** Server-computed only (Phase 9C) — see `curriculum/content` for the full content editor feature. */
  contentStatus: ContentStatus
  createdAt: string
  updatedAt: string
}

export interface CurriculumModuleWithLessons extends CurriculumModule {
  lessons: CurriculumLesson[]
}

export interface CurriculumTree {
  courseId: string
  modules: CurriculumModuleWithLessons[]
}

export interface CurriculumReadinessBlocker {
  field: string
  message: string
}

export interface CurriculumReadinessSummary {
  moduleCount: number
  publishedModuleCount: number
  draftModuleCount: number
  lessonCount: number
  publishedLessonCount: number
  draftLessonCount: number
}

export interface CurriculumReadiness {
  ready: boolean
  blockers: CurriculumReadinessBlocker[]
  summary: CurriculumReadinessSummary
}

export interface ReorderItem {
  id: string
  order: number
}
