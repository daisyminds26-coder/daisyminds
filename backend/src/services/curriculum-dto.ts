import type { CourseModuleDocument } from '../models/course-module.model'
import type { ContentStatus, LessonDocument, LessonType } from '../models/lesson.model'
import type { ApprovalStatus } from '../models/shared/enums'

export interface ModuleDto {
  id: string
  courseId: string
  title: string
  description: string
  order: number
  status: ApprovalStatus
  estimatedDurationMinutes: number | null
  createdAt: string
  updatedAt: string
}

export interface LessonDto {
  id: string
  courseId: string
  courseModuleId: string
  title: string
  shortDescription: string
  order: number
  lessonType: LessonType
  status: ApprovalStatus
  estimatedDurationMinutes: number | null
  isPreview: boolean
  isMandatory: boolean
  prerequisiteLessonIds: string[]
  /** Phase 9C — surfaced here so the Curriculum Builder can show a content-readiness badge per lesson row without a second round trip. */
  contentStatus: ContentStatus
  createdAt: string
  updatedAt: string
}

export interface ModuleWithLessonsDto extends ModuleDto {
  lessons: LessonDto[]
}

export interface CurriculumTreeDto {
  courseId: string
  modules: ModuleWithLessonsDto[]
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

export interface CurriculumReadinessResult {
  ready: boolean
  blockers: CurriculumReadinessBlocker[]
  summary: CurriculumReadinessSummary
}

export function toModuleDto(module: CourseModuleDocument): ModuleDto {
  return {
    id: module._id.toString(),
    courseId: module.courseId.toString(),
    title: module.title,
    description: module.description,
    order: module.order,
    status: module.status,
    estimatedDurationMinutes: module.estimatedDurationMinutes,
    createdAt: module.createdAt.toISOString(),
    updatedAt: module.updatedAt.toISOString(),
  }
}

export function toLessonDto(lesson: LessonDocument): LessonDto {
  return {
    id: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    courseModuleId: lesson.courseModuleId.toString(),
    title: lesson.title,
    shortDescription: lesson.shortDescription,
    order: lesson.order,
    lessonType: lesson.lessonType,
    status: lesson.status,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    isPreview: lesson.isPreview,
    isMandatory: lesson.isMandatory,
    prerequisiteLessonIds: lesson.prerequisiteLessonIds.map((id) => id.toString()),
    contentStatus: lesson.contentStatus,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
  }
}
