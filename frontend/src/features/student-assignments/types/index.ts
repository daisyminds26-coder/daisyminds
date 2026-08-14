import type {
  AssignmentAttachment,
  AssignmentStatus,
  AssignmentSubmissionType,
  PassStatus,
} from '@/features/assignments/types'

export type StudentSubmissionState = 'UNSUBMITTED' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'GRADED'

/** Mirrors `backend/src/services/student-assignment-dto.ts#StudentAssignmentDto`. */
export interface StudentAssignment {
  id: string
  assignmentCode: string
  courseId: string
  courseTitle: string
  batchId: string
  batchName: string
  title: string
  shortDescription: string | null
  dueDateTime: string
  timezone: string
  maxMarks: number
  passingMarks: number | null
  allowLateSubmission: boolean
  lateUntil: string | null
  status: AssignmentStatus
  submissionState: StudentSubmissionState
  attemptNumber: number | null
  submittedAt: string | null
  submittedLate: boolean | null
  marksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  canSubmit: boolean
}

export interface StudentAssignmentDetail extends StudentAssignment {
  instructions: string
  submissionType: AssignmentSubmissionType
  allowedFileTypes: string[]
  maxFiles: number
  maxFileSizeBytes: number
  allowResubmission: boolean
  maxAttempts: number | null
  attachments: AssignmentAttachment[]
}
