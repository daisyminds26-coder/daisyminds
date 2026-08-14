import { apiGet, apiPatch, apiPost } from '@/shared/lib/api-client'
import type { CourseProgressSummary } from '@/features/student-portal/types'
import type { LessonDetail, LessonProgress } from '@/features/learning-player/types'

/** Every function mirrors `backend/src/routes/student-learning.routes.ts` exactly — the Learning Player's own self-scoped API namespace, mounted alongside (not inside) `student-portal.routes.ts`. */
export function getCourseProgress(courseId: string): Promise<CourseProgressSummary> {
  return apiGet<CourseProgressSummary>(`/student/courses/${courseId}/progress`)
}

export function getLessonDetail(courseId: string, lessonId: string): Promise<LessonDetail> {
  return apiGet<LessonDetail>(`/student/courses/${courseId}/lessons/${lessonId}`)
}

export function getLessonMediaUrl(
  courseId: string,
  lessonId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return apiGet<{ url: string; expiresInSeconds: number }>(
    `/student/courses/${courseId}/lessons/${lessonId}/media`,
  )
}

export function updateLessonProgress(
  courseId: string,
  lessonId: string,
  positionSeconds: number,
): Promise<LessonProgress> {
  return apiPatch<LessonProgress>(`/student/courses/${courseId}/lessons/${lessonId}/progress`, {
    positionSeconds,
  })
}

export function markLessonComplete(courseId: string, lessonId: string): Promise<LessonProgress> {
  return apiPost<LessonProgress>(`/student/courses/${courseId}/lessons/${lessonId}/complete`)
}
