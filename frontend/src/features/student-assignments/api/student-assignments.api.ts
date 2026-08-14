import { apiDelete, apiGet, apiPost } from '@/shared/lib/api-client'
import type { AssignmentSubmission } from '@/features/assignments/types'
import type { SignedUploadParams } from '@/features/assignments/api/assignments.api'
import type {
  StudentAssignment,
  StudentAssignmentDetail,
} from '@/features/student-assignments/types'

/** Every function here mirrors `backend/src/routes/student-assignment.routes.ts` exactly — the self-scoped `/student/assignments/*` namespace. */
export function listMyAssignments(): Promise<StudentAssignment[]> {
  return apiGet<StudentAssignment[]>('/student/assignments')
}

export function getMyAssignment(id: string): Promise<StudentAssignmentDetail> {
  return apiGet<StudentAssignmentDetail>(`/student/assignments/${id}`)
}

export function getMyAttemptHistory(id: string): Promise<AssignmentSubmission[]> {
  return apiGet<AssignmentSubmission[]>(`/student/assignments/${id}/history`)
}

export function saveDraft(
  id: string,
  payload: { textResponse?: string; linkResponse?: string },
): Promise<AssignmentSubmission> {
  return apiPost<AssignmentSubmission>(`/student/assignments/${id}/submissions/draft`, payload)
}

export function submitAssignment(
  id: string,
  payload: { textResponse?: string; linkResponse?: string },
): Promise<AssignmentSubmission> {
  return apiPost<AssignmentSubmission>(`/student/assignments/${id}/submissions/submit`, payload)
}

export function getFileUploadSignature(id: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/student/assignments/${id}/submissions/files/signature`)
}

export function confirmFile(
  id: string,
  publicId: string,
  filename: string,
): Promise<AssignmentSubmission> {
  return apiPost<AssignmentSubmission>(`/student/assignments/${id}/submissions/files`, {
    publicId,
    filename,
  })
}

export function removeFile(id: string, fileId: string): Promise<AssignmentSubmission> {
  return apiDelete<AssignmentSubmission>(`/student/assignments/${id}/submissions/files/${fileId}`)
}

export function getSubmissionFileDeliveryUrl(
  id: string,
  fileId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return apiGet<{ url: string; expiresInSeconds: number }>(
    `/student/assignments/${id}/submissions/files/${fileId}/delivery-url`,
  )
}

export function getAssignmentAttachmentDeliveryUrl(
  id: string,
  attachmentId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  return apiGet<{ url: string; expiresInSeconds: number }>(
    `/student/assignments/${id}/attachments/${attachmentId}/delivery-url`,
  )
}
