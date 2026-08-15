import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminSessionSummary,
  AdminStudent,
  AdminStudentListItem,
  AuditLogEntry,
  Gender,
  GradeType,
  ListStudentsParams,
  SignedUploadParams,
  StudentBulkAction,
  StudentBulkActionResult,
  StudentSource,
} from '@/features/students/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/student.routes.ts`
 * and `backend/src/validators/student.validator.ts` exactly. No component
 * calls `apiClient`/`apiGet`/etc. directly.
 *
 * Deliberately separate *input* shapes (`AddressInput`, `EmergencyContactInput`,
 * `EducationRecordInput`) from the read-side DTOs in `features/students/types`
 * (`StudentAddress`, `EmergencyContact`, `EducationRecord`) — the read DTOs
 * use `string | null` throughout (what the backend actually returns), while
 * a request body naturally omits an empty optional field (`string | undefined`)
 * rather than sending an explicit `null`. Reusing the read type for both
 * directions was tried first and produced exactly this null-vs-undefined
 * mismatch against the RHF form's output shape.
 */
export interface AddressInput {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface EmergencyContactInput {
  name: string
  phone: string
  relationship: string
  alternatePhone?: string
  email?: string
}

export interface EducationRecordInput {
  degree: string
  institution: string
  yearOfCompletion: number
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  gradeValue: string | null
  gradeType: GradeType | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface StudentProfileFields {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender?: Gender
  preferredLanguage?: string
  phone: string
  address: AddressInput
  emergencyContacts: EmergencyContactInput[]
  educationRecords?: EducationRecordInput[]
  admissionDate?: string
  source?: StudentSource
  counsellorId?: string
  notes?: string
  tags?: string[]
}

export interface CreateStudentPayload extends StudentProfileFields {
  email: string
  password: string
  sendInvitation: boolean
}

export type UpdateStudentPayload = Partial<StudentProfileFields>

export function listStudents(
  params: ListStudentsParams,
): Promise<{ data: AdminStudentListItem[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminStudentListItem>('/students', { params })
}

export function getStudent(id: string): Promise<AdminStudent> {
  return apiGet<AdminStudent>(`/students/${id}`)
}

export function createStudent(payload: CreateStudentPayload): Promise<AdminStudent> {
  return apiPost<AdminStudent>('/students', payload)
}

export function updateStudent(id: string, payload: UpdateStudentPayload): Promise<AdminStudent> {
  return apiPatch<AdminStudent>(`/students/${id}`, payload)
}

export function activateStudent(id: string): Promise<AdminStudent> {
  return apiPost<AdminStudent>(`/students/${id}/activate`)
}

export function deactivateStudent(id: string): Promise<AdminStudent> {
  return apiPost<AdminStudent>(`/students/${id}/deactivate`)
}

export function softDeleteStudent(id: string): Promise<null> {
  return apiDelete<null>(`/students/${id}`)
}

export function restoreStudent(id: string): Promise<AdminStudent> {
  return apiPost<AdminStudent>(`/students/${id}/restore`)
}

export function resendInvitation(id: string): Promise<null> {
  return apiPost<null>(`/students/${id}/resend-invitation`)
}

export function getStudentSessions(id: string): Promise<AdminSessionSummary[]> {
  return apiGet<AdminSessionSummary[]>(`/students/${id}/sessions`)
}

export function forceLogoutSession(id: string, sessionId: string): Promise<null> {
  return apiDelete<null>(`/students/${id}/sessions/${sessionId}`)
}

export function forceLogoutAll(id: string): Promise<null> {
  return apiPost<null>(`/students/${id}/logout-all`)
}

export function bulkAction(
  action: StudentBulkAction,
  studentIds: string[],
): Promise<StudentBulkActionResult> {
  return apiPost<StudentBulkActionResult>('/students/bulk', { action, studentIds })
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/students/${id}/audit-log`, { params: { page, limit } })
}

export async function exportStudentsCsv(
  params: Omit<ListStudentsParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/students/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}

export function getPhotoUploadSignature(id: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/students/${id}/photo/signature`)
}

export function confirmPhoto(id: string, publicId: string): Promise<AdminStudent> {
  return apiPatch<AdminStudent>(`/students/${id}/photo`, { publicId })
}

export function removePhoto(id: string): Promise<AdminStudent> {
  return apiDelete<AdminStudent>(`/students/${id}/photo`)
}
