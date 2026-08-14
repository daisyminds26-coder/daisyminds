import { apiGet, apiPatch } from '@/shared/lib/api-client'
import type {
  AdminAssessment,
  AttemptSummary,
  GraderAttempt,
  GradeAttemptPayload,
  ListAttemptsParams,
} from '@/features/assessments/types'

/** Every function here mirrors `backend/src/routes/trainer-assessment.routes.ts` exactly — the self-scoped `/trainer/assessments*` namespace, filtered server-side to assessments targeting a batch this trainer teaches. */
export function listMyAssessments(): Promise<AdminAssessment[]> {
  return apiGet<AdminAssessment[]>('/trainer/assessments')
}

export function getMyAssessment(id: string): Promise<AdminAssessment> {
  return apiGet<AdminAssessment>(`/trainer/assessments/${id}`)
}

export function listMyAttempts(id: string, params: ListAttemptsParams): Promise<AttemptSummary[]> {
  return apiGet<AttemptSummary[]>(`/trainer/assessments/${id}/attempts`, { params })
}

export function getMyAttempt(attemptId: string): Promise<GraderAttempt> {
  return apiGet<GraderAttempt>(`/trainer/assessment-attempts/${attemptId}`)
}

export function gradeMyAttempt(
  attemptId: string,
  payload: GradeAttemptPayload,
): Promise<GraderAttempt> {
  return apiPatch<GraderAttempt>(`/trainer/assessment-attempts/${attemptId}/grade`, payload)
}
