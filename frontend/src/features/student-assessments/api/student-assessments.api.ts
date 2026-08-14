import { apiGet, apiPatch, apiPost } from '@/shared/lib/api-client'
import type {
  AnswerEntryPayload,
  StudentAssessment,
  StudentAssessmentDetail,
  StudentAttempt,
} from '@/features/student-assessments/types'

export function listMyAssessments(): Promise<StudentAssessment[]> {
  return apiGet<StudentAssessment[]>('/student/assessments')
}

export function getMyAssessment(id: string): Promise<StudentAssessmentDetail> {
  return apiGet<StudentAssessmentDetail>(`/student/assessments/${id}`)
}

export function startAttempt(id: string): Promise<StudentAttempt> {
  return apiPost<StudentAttempt>(`/student/assessments/${id}/start`)
}

export function getMyAttempt(attemptId: string): Promise<StudentAttempt> {
  return apiGet<StudentAttempt>(`/student/assessments/attempts/${attemptId}`)
}

export function saveAnswers(
  attemptId: string,
  answers: AnswerEntryPayload[],
): Promise<{ savedAt: string }> {
  return apiPatch<{ savedAt: string }>(`/student/assessments/attempts/${attemptId}/answers`, {
    answers,
  })
}

export function submitAttempt(attemptId: string): Promise<StudentAttempt> {
  return apiPost<StudentAttempt>(`/student/assessments/attempts/${attemptId}/submit`)
}

export function recordFocusLoss(attemptId: string): Promise<{ focusLossCount: number }> {
  return apiPost<{ focusLossCount: number }>(
    `/student/assessments/attempts/${attemptId}/focus-loss`,
  )
}
