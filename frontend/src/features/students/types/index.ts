import type { AccountStatus } from '@/features/auth/types'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const
export type Gender = (typeof GENDERS)[number]

export const STUDENT_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'SOCIAL_MEDIA',
  'ADVERTISEMENT',
  'OTHER',
] as const
export type StudentSource = (typeof STUDENT_SOURCES)[number]

export const GRADE_TYPES = ['PERCENTAGE', 'CGPA', 'GRADE'] as const
export type GradeType = (typeof GRADE_TYPES)[number]

export const PROFILE_COMPLETION_STATUSES = ['INCOMPLETE', 'PARTIAL', 'COMPLETE'] as const
export type ProfileCompletionStatus = (typeof PROFILE_COMPLETION_STATUSES)[number]

export interface StudentAddress {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
  alternatePhone: string | null
  email: string | null
}

export interface EducationRecord {
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

/** Mirrors `backend/src/services/student-management.service.ts#AdminStudentDto` exactly. */
export interface AdminStudent {
  id: string
  userId: string
  studentId: string
  email: string
  status: AccountStatus
  isDeleted: boolean
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  firstName: string
  middleName: string | null
  lastName: string
  displayName: string | null
  dateOfBirth: string | null
  gender: Gender | null
  preferredLanguage: string | null
  phone: string | null
  alternatePhone: string | null
  address: StudentAddress | null
  emergencyContacts: EmergencyContact[]
  guardianName: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  guardianRelationship: string | null
  guardianOccupation: string | null
  guardianAddressSameAsStudent: boolean
  guardianAddress: StudentAddress | null
  educationRecords: EducationRecord[]
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null
  admissionDate: string | null
  source: StudentSource | null
  counsellorId: string | null
  notes: string | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  createdAt: string
  updatedAt: string
}

/** The lighter row shape `GET /students` actually returns — mirrors `AdminStudentListItemDto`. */
export interface AdminStudentListItem {
  id: string
  userId: string
  studentId: string
  email: string
  status: AccountStatus
  isDeleted: boolean
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  phone: string | null
  address: StudentAddress | null
  admissionDate: string | null
  gender: Gender | null
  source: StudentSource | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  profilePhotoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminSessionSummary {
  id: string
  userAgent: string | null
  ipAddress: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type SortField =
  'studentId' | 'firstName' | 'lastName' | 'admissionDate' | 'createdAt' | 'updatedAt' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface ListStudentsParams {
  page: number
  limit: number
  sort?: `${SortField}:${SortDirection}`
  status?: AccountStatus
  gender?: Gender
  state?: string
  city?: string
  source?: StudentSource
  tag?: string
  profileCompletionStatus?: ProfileCompletionStatus
  admissionDateFrom?: string
  admissionDateTo?: string
  search?: string
  includeDeleted?: boolean
}

export type StudentBulkAction = 'activate' | 'deactivate' | 'delete' | 'restore'

export interface StudentBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

export interface SignedUploadParams {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  allowedFormats: string[]
  maxFileSize: number
}
