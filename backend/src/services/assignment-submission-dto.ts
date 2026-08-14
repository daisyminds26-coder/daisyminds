import type {
  AssignmentSubmissionDocument,
  AssignmentSubmissionStatus,
} from '../models/assignment-submission.model'
import type { StudentDocument } from '../models/student.model'
import { computeGrade, type PassStatus } from '../utils/assignment-grade.util'
import type { AssignmentAttachmentDto } from './assignment-dto'

/** One shape shared by the admin, trainer, and student surfaces — a student's own submission has nothing to hide from itself, and there is no internal-only field on this model (the task's own instruction: don't add `internalNotes` without a real consumer). */
export interface AssignmentSubmissionDto {
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
  files: AssignmentAttachmentDto[]
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

export function toAssignmentSubmissionDto(
  submission: AssignmentSubmissionDocument,
  student: Pick<StudentDocument, '_id' | 'studentId' | 'firstName' | 'lastName'>,
  maxMarks: number,
  passingMarks: number | null,
): AssignmentSubmissionDto {
  const { percentage, passStatus } = computeGrade(submission.marksAwarded, maxMarks, passingMarks)

  return {
    id: submission._id.toString(),
    submissionCode: submission.submissionCode,
    assignmentId: submission.assignmentId.toString(),
    studentId: student._id.toString(),
    studentCode: student.studentId,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    attemptNumber: submission.attemptNumber,
    status: submission.status,
    textResponse: submission.textResponse,
    linkResponse: submission.linkResponse,
    files: submission.files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      format: file.format,
      bytes: file.bytes,
    })),
    submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
    submittedLate: submission.submittedLate,
    marksAwarded: submission.marksAwarded,
    percentage,
    passStatus,
    feedback: submission.feedback,
    gradedAt: submission.gradedAt ? submission.gradedAt.toISOString() : null,
    returnedAt: submission.returnedAt ? submission.returnedAt.toISOString() : null,
    returnReason: submission.returnReason,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  }
}
