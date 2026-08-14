import { apiGet } from '@/shared/lib/api-client'
import type { LiveClassJoinDetails, StudentLiveClass } from '@/features/student-live-classes/types'
import type { StudentAttendanceOverview } from '@/features/attendance/types'

/** Every function here mirrors `backend/src/routes/student-live-class.routes.ts` exactly — the self-scoped `/student/live-classes/*` + `/student/attendance` namespace. */
export function listStudentLiveClasses(): Promise<StudentLiveClass[]> {
  return apiGet<StudentLiveClass[]>('/student/live-classes')
}

export function getStudentLiveClass(id: string): Promise<StudentLiveClass> {
  return apiGet<StudentLiveClass>(`/student/live-classes/${id}`)
}

export function getLiveClassJoinDetails(id: string): Promise<LiveClassJoinDetails> {
  return apiGet<LiveClassJoinDetails>(`/student/live-classes/${id}/join`)
}

export function getStudentAttendanceOverview(): Promise<StudentAttendanceOverview> {
  return apiGet<StudentAttendanceOverview>('/student/attendance')
}
