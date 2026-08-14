import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type { SignedUploadParams } from '@/features/courses/curriculum/content/types'
import type {
  AdminAssignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
  GradeSubmissionPayload,
  ListAssignmentsParams,
  ListSubmissionsParams,
} from '@/features/assignments/types'

/** Every function here mirrors `backend/src/routes/assignment.routes.ts` exactly — the admin `/assignments/*` namespace. */
export function listAssignments(
  params: ListAssignmentsParams,
): Promise<{ data: AdminAssignment[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminAssignment>('/assignments', { params })
}

export function getAssignment(id: string): Promise<AdminAssignment> {
  return apiGet<AdminAssignment>(`/assignments/${id}`)
}

export function createAssignment(payload: CreateAssignmentPayload): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>('/assignments', payload)
}

export function updateAssignment(
  id: string,
  payload: Partial<CreateAssignmentPayload>,
): Promise<AdminAssignment> {
  return apiPatch<AdminAssignment>(`/assignments/${id}`, payload)
}

export function publishAssignment(id: string): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>(`/assignments/${id}/publish`)
}

export function closeAssignment(id: string): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>(`/assignments/${id}/close`)
}

export function archiveAssignment(id: string): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>(`/assignments/${id}/archive`)
}

export function cancelAssignment(id: string, reason: string): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>(`/assignments/${id}/cancel`, { reason })
}

export type { SignedUploadParams }

export function getAttachmentUploadSignature(assignmentId: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/assignments/${assignmentId}/attachments/signature`)
}

export function confirmAttachment(
  assignmentId: string,
  publicId: string,
  filename: string,
): Promise<AdminAssignment> {
  return apiPost<AdminAssignment>(`/assignments/${assignmentId}/attachments`, {
    publicId,
    filename,
  })
}

export function removeAttachment(
  assignmentId: string,
  attachmentId: string,
): Promise<AdminAssignment> {
  return apiDelete<AdminAssignment>(`/assignments/${assignmentId}/attachments/${attachmentId}`)
}

export function getAttachmentDeliveryUrl(
  assignmentId: string,
  attachmentId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return apiGet<{ url: string; expiresInSeconds: number }>(
    `/assignments/${assignmentId}/attachments/${attachmentId}/delivery-url`,
  )
}

// ---- Submissions / grading (shared by the admin and trainer namespaces) ----

export function listSubmissions(
  assignmentId: string,
  params: ListSubmissionsParams,
): Promise<AssignmentSubmission[]> {
  return apiGet<AssignmentSubmission[]>(`/assignments/${assignmentId}/submissions`, { params })
}

export function getSubmission(
  assignmentId: string,
  submissionId: string,
): Promise<AssignmentSubmission> {
  return apiGet<AssignmentSubmission>(`/assignments/${assignmentId}/submissions/${submissionId}`)
}

export function getAttemptHistory(
  assignmentId: string,
  studentId: string,
): Promise<AssignmentSubmission[]> {
  return apiGet<AssignmentSubmission[]>(
    `/assignments/${assignmentId}/submissions/students/${studentId}/history`,
  )
}

export function gradeSubmission(
  assignmentId: string,
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<AssignmentSubmission> {
  return apiPatch<AssignmentSubmission>(
    `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    payload,
  )
}

export function returnSubmission(
  assignmentId: string,
  submissionId: string,
  reason: string,
): Promise<AssignmentSubmission> {
  return apiPost<AssignmentSubmission>(
    `/assignments/${assignmentId}/submissions/${submissionId}/return`,
    { reason },
  )
}

export async function exportSubmissionsCsv(params: {
  assignmentId?: string
  courseId?: string
  batchId?: string
}): Promise<Blob> {
  const response = await apiClient.get<Blob>('/assignments/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}
