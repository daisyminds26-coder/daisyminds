import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/lib/api-client'
import type {
  CurriculumLesson,
  CurriculumModule,
  CurriculumReadiness,
  CurriculumTree,
  LessonType,
  ReorderItem,
} from '@/features/courses/curriculum/types'

/** Mirrors `backend/src/routes/curriculum.routes.ts`/`backend/src/validators/curriculum.validator.ts` exactly — no component calls `apiClient`/`apiGet`/etc. directly. */

export interface CreateModulePayload {
  title: string
  description?: string
  estimatedDurationMinutes?: number
}
export type UpdateModulePayload = Partial<CreateModulePayload>

export interface CreateLessonPayload {
  title: string
  shortDescription?: string
  lessonType: LessonType
  estimatedDurationMinutes?: number
  isPreview?: boolean
  isMandatory?: boolean
  prerequisiteLessonIds?: string[]
}
export type UpdateLessonPayload = Partial<CreateLessonPayload>

export function getCurriculum(courseId: string): Promise<CurriculumTree> {
  return apiGet<CurriculumTree>(`/courses/${courseId}/curriculum`)
}

export function checkCurriculumReadiness(courseId: string): Promise<CurriculumReadiness> {
  return apiPost<CurriculumReadiness>(`/courses/${courseId}/curriculum/readiness-check`)
}

export function createModule(
  courseId: string,
  payload: CreateModulePayload,
): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules`, payload)
}

export function updateModule(
  courseId: string,
  moduleId: string,
  payload: UpdateModulePayload,
): Promise<CurriculumModule> {
  return apiPatch<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}`, payload)
}

export function reorderModules(
  courseId: string,
  items: ReorderItem[],
): Promise<CurriculumModule[]> {
  return apiPost<CurriculumModule[]>(`/courses/${courseId}/modules/reorder`, { items })
}

export function archiveModule(courseId: string, moduleId: string): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}/archive`)
}

export function restoreModule(courseId: string, moduleId: string): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}/restore`)
}

export function duplicateModule(courseId: string, moduleId: string): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}/duplicate`)
}

export function publishModule(courseId: string, moduleId: string): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}/publish`)
}

export function unpublishModule(courseId: string, moduleId: string): Promise<CurriculumModule> {
  return apiPost<CurriculumModule>(`/courses/${courseId}/modules/${moduleId}/unpublish`)
}

export function deleteModule(courseId: string, moduleId: string): Promise<null> {
  return apiDelete<null>(`/courses/${courseId}/modules/${moduleId}`)
}

export function createLesson(
  courseId: string,
  moduleId: string,
  payload: CreateLessonPayload,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(`/courses/${courseId}/modules/${moduleId}/lessons`, payload)
}

export function updateLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  payload: UpdateLessonPayload,
): Promise<CurriculumLesson> {
  return apiPatch<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    payload,
  )
}

export function reorderLessons(
  courseId: string,
  moduleId: string,
  items: ReorderItem[],
): Promise<CurriculumLesson[]> {
  return apiPost<CurriculumLesson[]>(`/courses/${courseId}/lessons/reorder`, { moduleId, items })
}

export function moveLesson(
  courseId: string,
  lessonId: string,
  targetModuleId: string,
  targetOrder: number,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(`/courses/${courseId}/lessons/${lessonId}/move`, {
    targetModuleId,
    targetOrder,
  })
}

export function archiveLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/archive`,
  )
}

export function restoreLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/restore`,
  )
}

export function duplicateLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/duplicate`,
  )
}

export function publishLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`,
  )
}

export function unpublishLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<CurriculumLesson> {
  return apiPost<CurriculumLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/unpublish`,
  )
}

export function deleteLesson(courseId: string, moduleId: string, lessonId: string): Promise<null> {
  return apiDelete<null>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)
}
