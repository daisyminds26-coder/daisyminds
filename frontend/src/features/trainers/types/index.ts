import type { AccountStatus } from '@/features/auth/types'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const
export type Gender = (typeof GENDERS)[number]

export const GRADE_TYPES = ['PERCENTAGE', 'CGPA', 'GRADE'] as const
export type GradeType = (typeof GRADE_TYPES)[number]

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'VISITING',
  'FREELANCE',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const TEACHING_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type TeachingMode = (typeof TEACHING_MODES)[number]

export const PREFERRED_TIME_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const
export type PreferredTimeSlot = (typeof PREFERRED_TIME_SLOTS)[number]

export const TEACHING_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const
export type TeachingLevel = (typeof TEACHING_LEVELS)[number]

export const AVAILABILITY_STATUSES = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export const AVAILABILITY_SLOT_TYPES = ['AVAILABLE', 'PREFERRED', 'BLOCKED'] as const
export type AvailabilitySlotType = (typeof AVAILABILITY_SLOT_TYPES)[number]

export const TRAINER_SOURCES = [
  'REFERRAL',
  'LINKEDIN',
  'JOB_PORTAL',
  'WALK_IN',
  'AGENCY',
  'OTHER',
] as const
export type TrainerSource = (typeof TRAINER_SOURCES)[number]

export const PROFILE_COMPLETION_STATUSES = ['INCOMPLETE', 'PARTIAL', 'COMPLETE'] as const
export type ProfileCompletionStatus = (typeof PROFILE_COMPLETION_STATUSES)[number]

export interface TrainerAddress {
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

export interface Qualification {
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

export interface Certification {
  name: string
  issuingOrganization: string
  credentialId: string | null
  issueDate: string
  expiryDate: string | null
  verificationUrl: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface AvailabilitySlot {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  timeZone: string
  type: AvailabilitySlotType
  effectiveFrom: string | null
  effectiveTo: string | null
}

export interface TrainerDocumentMeta {
  type: string
  url: string
  publicId: string | null
  uploadedAt: string
}

/** Mirrors `backend/src/services/trainer-management.service.ts#AdminTrainerDto` exactly. */
export interface AdminTrainer {
  id: string
  userId: string
  trainerId: string
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
  bio: string
  phone: string | null
  alternatePhone: string | null
  address: TrainerAddress | null
  emergencyContacts: EmergencyContact[]
  designation: string | null
  department: string | null
  totalYearsExperience: number | null
  teachingYearsExperience: number | null
  industryYearsExperience: number | null
  expertiseAreas: string[]
  secondaryExpertise: string[]
  skills: string[]
  technologies: string[]
  specializations: string[]
  linkedinUrl: string | null
  portfolioUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  qualifications: Qualification[]
  certifications: Certification[]
  joiningDate: string | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  employeeCode: string | null
  reportingManagerId: string | null
  workLocation: string | null
  probationEndDate: string | null
  noticePeriodDays: number | null
  preferredTeachingModes: TeachingMode[]
  preferredTimeSlots: PreferredTimeSlot[]
  maxConcurrentBatches: number | null
  maxWeeklyTeachingHours: number | null
  availabilityStatus: AvailabilityStatus
  availabilityNotes: string | null
  languagesOfInstruction: string[]
  teachingLevel: TeachingLevel | null
  qualifiedToTeachSubjects: string[]
  availability: AvailabilitySlot[]
  documents: TrainerDocumentMeta[]
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null
  source: TrainerSource | null
  notes: string | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  createdAt: string
  updatedAt: string
}

/** The lighter row shape `GET /trainers` actually returns — mirrors `AdminTrainerListItemDto`. */
export interface AdminTrainerListItem {
  id: string
  userId: string
  trainerId: string
  email: string
  status: AccountStatus
  isDeleted: boolean
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  designation: string | null
  department: string | null
  expertiseAreas: string[]
  totalYearsExperience: number | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  availabilityStatus: AvailabilityStatus
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
  | 'trainerId'
  | 'firstName'
  | 'lastName'
  | 'joiningDate'
  | 'totalYearsExperience'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'employmentStatus'
  | 'profileCompletionPercentage'
export type SortDirection = 'asc' | 'desc'

export interface ListTrainersParams {
  page: number
  limit: number
  sort?: `${SortField}:${SortDirection}`
  status?: AccountStatus
  employmentStatus?: EmploymentStatus
  employmentType?: EmploymentType
  department?: string
  designation?: string
  expertise?: string
  technology?: string
  availabilityStatus?: AvailabilityStatus
  profileCompletionStatus?: ProfileCompletionStatus
  city?: string
  state?: string
  tag?: string
  search?: string
  includeDeleted?: boolean
}

export type TrainerBulkAction = 'activate' | 'deactivate' | 'delete' | 'restore'

export interface TrainerBulkActionResult {
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
