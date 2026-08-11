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
  AdminTrainer,
  AdminTrainerListItem,
  AuditLogEntry,
  AvailabilitySlotType,
  AvailabilityStatus,
  DayOfWeek,
  EmploymentStatus,
  EmploymentType,
  Gender,
  GradeType,
  ListTrainersParams,
  PreferredTimeSlot,
  SignedUploadParams,
  TeachingLevel,
  TeachingMode,
  TrainerBulkAction,
  TrainerBulkActionResult,
  TrainerSource,
} from '@/features/trainers/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/trainer.routes.ts`
 * and `backend/src/validators/trainer.validator.ts` exactly. No component
 * calls `apiClient`/`apiGet`/etc. directly.
 *
 * Deliberately separate *input* shapes from the read-side DTOs in
 * `features/trainers/types` — see `features/students/api/students.api.ts`'s
 * comment for why (the read DTOs use `string | null` throughout; a request
 * body naturally omits an empty optional field instead of sending `null`).
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

export interface QualificationInput {
  degree: string
  institution: string
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  yearOfCompletion: number
  gradeValue: string | null
  gradeType: GradeType | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface CertificationInput {
  name: string
  issuingOrganization: string
  credentialId: string | null
  issueDate: string
  expiryDate: string | null
  verificationUrl: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface AvailabilitySlotInput {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  timeZone: string
  type: AvailabilitySlotType
  effectiveFrom?: string
  effectiveTo?: string
}

export interface TrainerProfileFields {
  firstName: string
  middleName?: string
  lastName: string
  displayName?: string
  dateOfBirth?: string
  gender?: Gender
  preferredLanguage?: string
  bio?: string
  phone: string
  alternatePhone?: string
  address?: AddressInput
  emergencyContacts?: EmergencyContactInput[]
  designation?: string
  department?: string
  totalYearsExperience?: number
  teachingYearsExperience?: number
  industryYearsExperience?: number
  expertiseAreas?: string[]
  secondaryExpertise?: string[]
  skills?: string[]
  technologies?: string[]
  specializations?: string[]
  linkedinUrl?: string
  portfolioUrl?: string
  githubUrl?: string
  websiteUrl?: string
  qualifications?: QualificationInput[]
  certifications?: CertificationInput[]
  joiningDate?: string
  employmentType?: EmploymentType
  employmentStatus?: EmploymentStatus
  employeeCode?: string
  reportingManagerId?: string
  workLocation?: string
  probationEndDate?: string
  noticePeriodDays?: number
  preferredTeachingModes?: TeachingMode[]
  preferredTimeSlots?: PreferredTimeSlot[]
  maxConcurrentBatches?: number
  maxWeeklyTeachingHours?: number
  availabilityStatus?: AvailabilityStatus
  availabilityNotes?: string
  languagesOfInstruction?: string[]
  teachingLevel?: TeachingLevel
  qualifiedToTeachSubjects?: string[]
  availability?: AvailabilitySlotInput[]
  source?: TrainerSource
  notes?: string
  tags?: string[]
}

export interface CreateTrainerPayload extends TrainerProfileFields {
  email: string
  password: string
  sendInvitation: boolean
}

export type UpdateTrainerPayload = Partial<TrainerProfileFields>

export function listTrainers(
  params: ListTrainersParams,
): Promise<{ data: AdminTrainerListItem[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminTrainerListItem>('/trainers', { params })
}

export function getTrainer(id: string): Promise<AdminTrainer> {
  return apiGet<AdminTrainer>(`/trainers/${id}`)
}

export function createTrainer(payload: CreateTrainerPayload): Promise<AdminTrainer> {
  return apiPost<AdminTrainer>('/trainers', payload)
}

export function updateTrainer(id: string, payload: UpdateTrainerPayload): Promise<AdminTrainer> {
  return apiPatch<AdminTrainer>(`/trainers/${id}`, payload)
}

export function activateTrainer(id: string): Promise<AdminTrainer> {
  return apiPost<AdminTrainer>(`/trainers/${id}/activate`)
}

export function deactivateTrainer(id: string): Promise<AdminTrainer> {
  return apiPost<AdminTrainer>(`/trainers/${id}/deactivate`)
}

export function softDeleteTrainer(id: string): Promise<null> {
  return apiDelete<null>(`/trainers/${id}`)
}

export function restoreTrainer(id: string): Promise<AdminTrainer> {
  return apiPost<AdminTrainer>(`/trainers/${id}/restore`)
}

export function resendInvitation(id: string): Promise<null> {
  return apiPost<null>(`/trainers/${id}/resend-invitation`)
}

export function getTrainerSessions(id: string): Promise<AdminSessionSummary[]> {
  return apiGet<AdminSessionSummary[]>(`/trainers/${id}/sessions`)
}

export function forceLogoutSession(id: string, sessionId: string): Promise<null> {
  return apiDelete<null>(`/trainers/${id}/sessions/${sessionId}`)
}

export function forceLogoutAll(id: string): Promise<null> {
  return apiPost<null>(`/trainers/${id}/logout-all`)
}

export function bulkAction(
  action: TrainerBulkAction,
  trainerIds: string[],
): Promise<TrainerBulkActionResult> {
  return apiPost<TrainerBulkActionResult>('/trainers/bulk', { action, trainerIds })
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/trainers/${id}/audit-log`, { params: { page, limit } })
}

export async function exportTrainersCsv(
  params: Omit<ListTrainersParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/trainers/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}

export function getPhotoUploadSignature(id: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/trainers/${id}/photo/signature`)
}

export function confirmPhoto(id: string, publicId: string): Promise<AdminTrainer> {
  return apiPatch<AdminTrainer>(`/trainers/${id}/photo`, { publicId })
}

export function removePhoto(id: string): Promise<AdminTrainer> {
  return apiDelete<AdminTrainer>(`/trainers/${id}/photo`)
}
