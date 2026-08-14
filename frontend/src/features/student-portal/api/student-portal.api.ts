import { apiGet, apiPatch } from '@/shared/lib/api-client'
import type {
  ScheduleOccurrence,
  StudentCourseDetail,
  StudentDashboard,
  StudentEnrollment,
  StudentProfile,
  StudentResource,
  UpdateStudentProfilePayload,
} from '@/features/student-portal/types'

/** Every function here mirrors `backend/src/routes/student-portal.routes.ts` exactly — a self-scoped `/student/*` namespace, never `/students/*` (the admin module). */
export function getStudentDashboard(): Promise<StudentDashboard> {
  return apiGet<StudentDashboard>('/student/dashboard')
}

export function listStudentEnrollments(): Promise<StudentEnrollment[]> {
  return apiGet<StudentEnrollment[]>('/student/enrollments')
}

export function getStudentEnrollment(enrollmentId: string): Promise<StudentEnrollment> {
  return apiGet<StudentEnrollment>(`/student/enrollments/${enrollmentId}`)
}

export function listStudentCourses(): Promise<StudentEnrollment[]> {
  return apiGet<StudentEnrollment[]>('/student/courses')
}

export function getStudentCourse(courseId: string): Promise<StudentCourseDetail> {
  return apiGet<StudentCourseDetail>(`/student/courses/${courseId}`)
}

export function listStudentSchedule(): Promise<ScheduleOccurrence[]> {
  return apiGet<ScheduleOccurrence[]>('/student/schedule')
}

export function listStudentResources(): Promise<StudentResource[]> {
  return apiGet<StudentResource[]>('/student/resources')
}

export function getResourceDeliveryUrl(
  resourceId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return apiGet<{ url: string; expiresInSeconds: number }>(
    `/student/resources/${resourceId}/delivery-url`,
  )
}

export function getStudentProfile(): Promise<StudentProfile> {
  return apiGet<StudentProfile>('/student/profile')
}

export function updateStudentProfile(
  payload: UpdateStudentProfilePayload,
): Promise<StudentProfile> {
  return apiPatch<StudentProfile>('/student/profile', payload)
}
