import type {
  AssignmentDocument,
  AssignmentStatus,
  AssignmentSubmissionType,
} from '../models/assignment.model'
import type {
  AssignmentSubmissionDocument,
  AssignmentSubmissionStatus,
} from '../models/assignment-submission.model'
import { computeGrade, type PassStatus } from '../utils/assignment-grade.util'
import type { AssignmentAttachmentDto } from './assignment-dto'

export type StudentSubmissionState = 'UNSUBMITTED' | AssignmentSubmissionStatus

export interface StudentAssignmentDto {
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

export interface StudentAssignmentDetailDto extends StudentAssignmentDto {
  instructions: string
  submissionType: AssignmentSubmissionType
  allowedFileTypes: string[]
  maxFiles: number
  maxFileSizeBytes: number
  allowResubmission: boolean
  maxAttempts: number | null
  attachments: AssignmentAttachmentDto[]
}

/**
 * A student may only ever be Enrolllled in **one** batch of a given course
 * (existing Enrollllment-uniqueness rule) — so "the batch" for an assignment
 * targeting several batches of that course is unambiguous: whichever of
 * `assignment.batchIds` matches this student's own Enrolllled batch.
 */
export function toStudentAssignmentDto(
  assignment: AssignmentDocument,
  courseTitle: string,
  batchId: string,
  batchName: string,
  latestAttempt: AssignmentSubmissionDocument | null,
  canSubmit: boolean,
): StudentAssignmentDto {
  const { percentage, passStatus } = latestAttempt
    ? computeGrade(latestAttempt.marksAwarded, assignment.maxMarks, assignment.passingMarks)
    : { percentage: null, passStatus: null }

  return {
    id: assignment._id.toString(),
    assignmentCode: assignment.assignmentCode,
    courseId: assignment.courseId.toString(),
    courseTitle,
    batchId,
    batchName,
    title: assignment.title,
    shortDescription: assignment.shortDescription,
    dueDateTime: assignment.dueDateTime.toISOString(),
    timezone: assignment.timezone,
    maxMarks: assignment.maxMarks,
    passingMarks: assignment.passingMarks,
    allowLateSubmission: assignment.allowLateSubmission,
    lateUntil: assignment.lateUntil ? assignment.lateUntil.toISOString() : null,
    status: assignment.status,
    submissionState: latestAttempt ? latestAttempt.status : 'UNSUBMITTED',
    attemptNumber: latestAttempt ? latestAttempt.attemptNumber : null,
    submittedAt: latestAttempt?.submittedAt ? latestAttempt.submittedAt.toISOString() : null,
    submittedLate: latestAttempt ? latestAttempt.submittedLate : null,
    marksAwarded: latestAttempt ? latestAttempt.marksAwarded : null,
    percentage,
    passStatus,
    canSubmit,
  }
}

export function toStudentAssignmentDetailDto(
  base: StudentAssignmentDto,
  assignment: AssignmentDocument,
): StudentAssignmentDetailDto {
  return {
    ...base,
    instructions: assignment.instructions,
    submissionType: assignment.submissionType,
    allowedFileTypes: assignment.allowedFileTypes,
    maxFiles: assignment.maxFiles,
    maxFileSizeBytes: assignment.maxFileSizeBytes,
    allowResubmission: assignment.allowResubmission,
    maxAttempts: assignment.maxAttempts,
    attachments: assignment.attachments.map((attachment) => ({
      id: attachment._id.toString(),
      filename: attachment.filename,
      format: attachment.format,
      bytes: attachment.bytes,
    })),
  }
}
