import { apiGet, apiPatch, apiPost } from '@/shared/lib/api-client'
import type {
  AdminAssignment,
  AssignmentSubmission,
  GradeSubmissionPayload,
  ListSubmissionsParams,
} from '@/features/assignments/types'

/** Every function here mirrors `backend/src/routes/trainer-assignment.routes.ts` exactly — the self-scoped `/trainer/assignments/*` namespace. Response shapes are identical to the admin namespace's (a trainer, like an admin, is an "operator"), filtered server-side to assignments targeting a batch this trainer teaches. */
export function listMyAssignments(): Promise<AdminAssignment[]> {
  return apiGet<AdminAssignment[]>('/trainer/assignments')
}

export function getMyAssignment(id: string): Promise<AdminAssignment> {
  return apiGet<AdminAssignment>(`/trainer/assignments/${id}`)
}

export function listMySubmissions(
  id: string,
  params: ListSubmissionsParams,
): Promise<AssignmentSubmission[]> {
  return apiGet<AssignmentSubmission[]>(`/trainer/assignments/${id}/submissions`, { params })
}

export function getMySubmission(id: string, submissionId: string): Promise<AssignmentSubmission> {
  return apiGet<AssignmentSubmission>(`/trainer/assignments/${id}/submissions/${submissionId}`)
}

export function getMyAttemptHistory(
  id: string,
  studentId: string,
): Promise<AssignmentSubmission[]> {
  return apiGet<AssignmentSubmission[]>(
    `/trainer/assignments/${id}/submissions/students/${studentId}/history`,
  )
}

export function gradeMySubmission(
  id: string,
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<AssignmentSubmission> {
  return apiPatch<AssignmentSubmission>(
    `/trainer/assignments/${id}/submissions/${submissionId}/grade`,
    payload,
  )
}

export function returnMySubmission(
  id: string,
  submissionId: string,
  reason: string,
): Promise<AssignmentSubmission> {
  return apiPost<AssignmentSubmission>(
    `/trainer/assignments/${id}/submissions/${submissionId}/return`,
    {
      reason,
    },
  )
}
