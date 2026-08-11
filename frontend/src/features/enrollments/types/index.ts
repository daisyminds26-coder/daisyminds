export const ENROLLMENT_STATUSES = [
  'PENDING',
  'WAITLISTED',
  'CONFIRMED',
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
  'DROPPED',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const ENROLLMENT_SOURCES = [
  'ADMIN',
  'BULK_IMPORT',
  'TRANSFER',
  'SELF_SERVICE',
  'API',
] as const
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number]

/** Server-derived (never re-computed client-side) — see `backend/src/services/enrollment-access.service.ts#computeEnrollmentAccessState`. */
export const ENROLLMENT_ACCESS_STATES = [
  'ACTIVE',
  'LIFETIME',
  'NOT_YET_ACTIVE',
  'SUSPENDED',
  'ENDED',
  'NONE',
] as const
export type EnrollmentAccessState = (typeof ENROLLMENT_ACCESS_STATES)[number]

export const ENROLLMENT_BULK_LIFECYCLE_ACTIONS = ['suspend', 'resume', 'cancel'] as const
export type EnrollmentBulkLifecycleAction = (typeof ENROLLMENT_BULK_LIFECYCLE_ACTIONS)[number]

export interface EnrollmentStudentSummary {
  id: string
  studentCode: string | null
  name: string
  email: string | null
}

export interface EnrollmentBatchSummary {
  id: string
  batchCode: string | null
  name: string | null
  status: string | null
}

export interface EnrollmentCourseSummary {
  id: string
  courseCode: string | null
  title: string | null
}

export interface AdminEnrollmentListItem {
  id: string
  enrollmentCode: string
  status: EnrollmentStatus
  accessState: EnrollmentAccessState
  source: EnrollmentSource
  enrollmentDate: string
  waitlistPosition: number | null
  activatedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  student: EnrollmentStudentSummary | null
  batch: EnrollmentBatchSummary | null
  course: EnrollmentCourseSummary | null
}

export interface AdminEnrollment {
  id: string
  enrollmentCode: string
  studentId: string
  batchId: string
  courseId: string
  status: EnrollmentStatus
  accessState: EnrollmentAccessState
  source: EnrollmentSource
  enrollmentDate: string
  waitlistPosition: number | null
  waitlistedAt: string | null
  confirmedAt: string | null
  activatedAt: string | null
  suspendedAt: string | null
  resumedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  droppedAt: string | null
  accessStartsAt: string | null
  accessEndsAt: string | null
  transferredFromEnrollmentId: string | null
  transferredToEnrollmentId: string | null
  transferReason: string | null
  cancellationReason: string | null
  dropReason: string | null
  internalNotes: string | null
  tags: string[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actorRole: string | null
  createdAt: string
}

export interface EnrollmentBulkResult {
  succeeded: string[]
  waitlisted: string[]
  failed: { id: string; reason: string }[]
}

export type SortField =
  'createdAt' | 'enrollmentCode' | 'status' | 'enrollmentDate' | 'activatedAt' | 'completedAt'
export type SortDirection = 'asc' | 'desc'

export interface ListEnrollmentsParams {
  page?: number
  limit?: number
  sort?: `${SortField}:${SortDirection}`
  status?: EnrollmentStatus
  studentId?: string
  batchId?: string
  courseId?: string
  source?: EnrollmentSource
  search?: string
  createdFrom?: string
  createdTo?: string
  includeDeleted?: boolean
}
