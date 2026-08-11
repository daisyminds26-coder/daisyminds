import { apiClient, apiGet, apiGetPaginated, apiPost, type ApiMeta } from '@/shared/lib/api-client'
import type {
  AdminEnrollment,
  AdminEnrollmentListItem,
  AuditLogEntry,
  EnrollmentBulkResult,
  ListEnrollmentsParams,
} from '@/features/enrollments/types'

/** Every field/endpoint here mirrors `backend/src/routes/enrollment.routes.ts` and `backend/src/validators/enrollment.validator.ts` exactly — see `features/batches/api/batches.api.ts`'s comment for why input shapes stay separate from the read-side DTOs. */
export interface CreateEnrollmentPayload {
  studentId: string
  batchId: string
  enrollmentDate?: string
  internalNotes?: string
  tags?: string[]
}

export interface CancelEnrollmentPayload {
  reason?: string
}

export interface DropEnrollmentPayload {
  reason?: string
}

export interface TransferEnrollmentPayload {
  targetBatchId: string
  reason?: string
}

export interface BulkEnrollPayload {
  batchId: string
  studentIds: string[]
}

export interface BulkLifecycleActionPayload {
  enrollmentIds: string[]
  reason?: string
}

export function listEnrollments(
  params: ListEnrollmentsParams,
): Promise<{ data: AdminEnrollmentListItem[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminEnrollmentListItem>('/enrollments', { params })
}

export function getEnrollment(id: string): Promise<AdminEnrollment> {
  return apiGet<AdminEnrollment>(`/enrollments/${id}`)
}

export function createEnrollment(payload: CreateEnrollmentPayload): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>('/enrollments', payload)
}

export function confirmEnrollment(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/confirm`)
}

export function promoteWaitlist(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/promote-waitlist`)
}

export function activateEnrollment(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/activate`)
}

export function suspendEnrollment(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/suspend`)
}

export function resumeEnrollment(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/resume`)
}

export function completeEnrollment(id: string): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/complete`)
}

export function cancelEnrollment(
  id: string,
  payload: CancelEnrollmentPayload,
): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/cancel`, payload)
}

export function dropEnrollment(
  id: string,
  payload: DropEnrollmentPayload,
): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/drop`, payload)
}

export function transferEnrollment(
  id: string,
  payload: TransferEnrollmentPayload,
): Promise<AdminEnrollment> {
  return apiPost<AdminEnrollment>(`/enrollments/${id}/transfer`, payload)
}

export function bulkEnroll(payload: BulkEnrollPayload): Promise<EnrollmentBulkResult> {
  return apiPost<EnrollmentBulkResult>('/enrollments/bulk/enroll', payload)
}

export function bulkSuspend(payload: BulkLifecycleActionPayload): Promise<EnrollmentBulkResult> {
  return apiPost<EnrollmentBulkResult>('/enrollments/bulk/suspend', payload)
}

export function bulkResume(payload: BulkLifecycleActionPayload): Promise<EnrollmentBulkResult> {
  return apiPost<EnrollmentBulkResult>('/enrollments/bulk/resume', payload)
}

export function bulkCancel(payload: BulkLifecycleActionPayload): Promise<EnrollmentBulkResult> {
  return apiPost<EnrollmentBulkResult>('/enrollments/bulk/cancel', payload)
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/enrollments/${id}/audit`, { params: { page, limit } })
}

export async function exportEnrollmentsCsv(
  params: Omit<ListEnrollmentsParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/enrollments/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}
