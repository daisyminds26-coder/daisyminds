import {
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  apiClient,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminAssessment,
  AttemptSummary,
  AssessmentAttemptCounts,
  CreateAssessmentPayload,
  GraderAttempt,
  GradeAttemptPayload,
  ListAssessmentsParams,
  ListAttemptsParams,
  ReadinessResult,
  SectionInputPayload,
  UpdateAssessmentPayload,
} from '@/features/assessments/types'

export function listAssessments(
  params: ListAssessmentsParams,
): Promise<{ data: AdminAssessment[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminAssessment>('/assessments', { params })
}

export function getAssessment(id: string): Promise<AdminAssessment> {
  return apiGet<AdminAssessment>(`/assessments/${id}`)
}

export function createAssessment(payload: CreateAssessmentPayload): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>('/assessments', payload)
}

export function updateAssessment(
  id: string,
  payload: UpdateAssessmentPayload,
): Promise<AdminAssessment> {
  return apiPatch<AdminAssessment>(`/assessments/${id}`, payload)
}

export function replaceSections(
  id: string,
  sections: SectionInputPayload[],
): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/sections`, { sections })
}

export function checkReadiness(id: string): Promise<ReadinessResult> {
  return apiPost<ReadinessResult>(`/assessments/${id}/readiness-check`)
}

export function publishAssessment(id: string): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/publish`)
}

export function closeAssessment(id: string): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/close`)
}

export function publishResults(id: string): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/publish-results`)
}

export function archiveAssessment(id: string): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/archive`)
}

export function cancelAssessment(id: string, reason: string): Promise<AdminAssessment> {
  return apiPost<AdminAssessment>(`/assessments/${id}/cancel`, { reason })
}

export function listAttempts(id: string, params: ListAttemptsParams): Promise<AttemptSummary[]> {
  return apiGet<AttemptSummary[]>(`/assessments/${id}/attempts`, { params })
}

export function getAttempt(id: string, attemptId: string): Promise<GraderAttempt> {
  return apiGet<GraderAttempt>(`/assessments/${id}/attempts/${attemptId}`)
}

export function gradeAttempt(
  id: string,
  attemptId: string,
  payload: GradeAttemptPayload,
): Promise<GraderAttempt> {
  return apiPatch<GraderAttempt>(`/assessments/${id}/attempts/${attemptId}/grade`, payload)
}

export function getResultsSummary(id: string): Promise<AssessmentAttemptCounts> {
  return apiGet<AssessmentAttemptCounts>(`/assessments/${id}/results`)
}

export async function exportResultsCsv(params: {
  assessmentId?: string
  courseId?: string
  batchId?: string
}): Promise<Blob> {
  const response = await apiClient.get<Blob>('/assessments/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}
