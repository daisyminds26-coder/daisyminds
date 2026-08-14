/** Mirrors `backend/src/models/assignment.model.ts` enums exactly. */
export const ASSIGNMENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED',
] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const ASSIGNMENT_SUBMISSION_TYPES = ['TEXT', 'FILE', 'LINK', 'MIXED'] as const
export type AssignmentSubmissionType = (typeof ASSIGNMENT_SUBMISSION_TYPES)[number]

/** Mirrors `backend/src/models/assignment-submission.model.ts#ASSIGNMENT_SUBMISSION_STATUSES` — "late" is a separate boolean, not a status value (see the backend model's own doc comment for why). */
export const ASSIGNMENT_SUBMISSION_STATUSES = ['DRAFT', 'SUBMITTED', 'RETURNED', 'GRADED'] as const
export type AssignmentSubmissionStatus = (typeof ASSIGNMENT_SUBMISSION_STATUSES)[number]

export type PassStatus = 'PASS' | 'FAIL'

export interface AssignmentAttachment {
  id: string
  filename: string
  format: string
  bytes: number
}

export interface AssignmentBatchSummary {
  id: string
  batchCode: string
  name: string
}

/** Mirrors `backend/src/services/assignment-dto.ts#AdminAssignmentDto` — shared by the admin and trainer surfaces. */
export interface AdminAssignment {
  id: string
  assignmentCode: string
  courseId: string
  courseCode: string
  courseTitle: string
  batches: AssignmentBatchSummary[]
  title: string
  shortDescription: string | null
  instructions: string
  submissionType: AssignmentSubmissionType
  allowedFileTypes: string[]
  maxFiles: number
  maxFileSizeBytes: number
  maxMarks: number
  passingMarks: number | null
  dueDateTime: string
  timezone: string
  allowLateSubmission: boolean
  lateUntil: string | null
  allowResubmission: boolean
  maxAttempts: number | null
  status: AssignmentStatus
  publishedAt: string | null
  closedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  attachments: AssignmentAttachment[]
  submittedCount: number
  gradedCount: number
  pendingGradingCount: number
  createdAt: string
  updatedAt: string
}

export interface ListAssignmentsParams {
  page?: number
  limit?: number
  sort?: `${'dueDateTime' | 'createdAt'}:${'asc' | 'desc'}`
  courseId?: string
  batchId?: string
  status?: AssignmentStatus
  search?: string
}

export interface CreateAssignmentPayload {
  courseId: string
  title: string
  shortDescription?: string
  instructions: string
  batchIds: string[]
  submissionType: AssignmentSubmissionType
  allowedFileTypes?: string[]
  maxFiles?: number
  maxFileSizeBytes?: number
  maxMarks: number
  passingMarks?: number
  dueDateTime: string
  timezone: string
  allowLateSubmission?: boolean
  lateUntil?: string
  allowResubmission?: boolean
  maxAttempts?: number
}

/** Mirrors `backend/src/services/assignment-submission-dto.ts#AssignmentSubmissionDto` — one shape shared by admin, trainer, and student. */
export interface AssignmentSubmission {
  id: string
  submissionCode: string
  assignmentId: string
  studentId: string
  studentCode: string
  studentName: string
  attemptNumber: number
  status: AssignmentSubmissionStatus
  textResponse: string | null
  linkResponse: string | null
  files: AssignmentAttachment[]
  submittedAt: string | null
  submittedLate: boolean
  marksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  feedback: string | null
  gradedAt: string | null
  returnedAt: string | null
  returnReason: string | null
  createdAt: string
  updatedAt: string
}

export interface ListSubmissionsParams {
  status?: 'SUBMITTED' | 'GRADED'
  lateOnly?: boolean
  search?: string
}

export interface GradeSubmissionPayload {
  marksAwarded: number
  feedback?: string
}
