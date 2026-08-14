import type {
  AssignmentDocument,
  AssignmentStatus,
  AssignmentSubmissionType,
} from '../models/assignment.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { AssignmentCounts } from '../repositories/assignment-submission.repository'

export interface AssignmentAttachmentDto {
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

/** The one assignment read shape shared by the admin and trainer surfaces — a trainer, like an admin, is an "operator" who needs full configuration + grading-progress counters, not a narrower view. */
export interface AdminAssignmentDto {
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
  attachments: AssignmentAttachmentDto[]
  submittedCount: number
  gradedCount: number
  pendingGradingCount: number
  createdAt: string
  updatedAt: string
}

export function toAdminAssignmentDto(
  assignment: AssignmentDocument,
  course: Pick<CourseDocument, '_id' | 'courseCode' | 'title'>,
  batchById: Map<string, Pick<BatchDocument, '_id' | 'batchCode' | 'name'>>,
  counts: AssignmentCounts | undefined,
): AdminAssignmentDto {
  return {
    id: assignment._id.toString(),
    assignmentCode: assignment.assignmentCode,
    courseId: course._id.toString(),
    courseCode: course.courseCode,
    courseTitle: course.title,
    batches: assignment.batchIds
      .map((id) => batchById.get(id.toString()))
      .filter((batch): batch is NonNullable<typeof batch> => batch !== undefined)
      .map((batch) => ({ id: batch._id.toString(), batchCode: batch.batchCode, name: batch.name })),
    title: assignment.title,
    shortDescription: assignment.shortDescription,
    instructions: assignment.instructions,
    submissionType: assignment.submissionType,
    allowedFileTypes: assignment.allowedFileTypes,
    maxFiles: assignment.maxFiles,
    maxFileSizeBytes: assignment.maxFileSizeBytes,
    maxMarks: assignment.maxMarks,
    passingMarks: assignment.passingMarks,
    dueDateTime: assignment.dueDateTime.toISOString(),
    timezone: assignment.timezone,
    allowLateSubmission: assignment.allowLateSubmission,
    lateUntil: assignment.lateUntil ? assignment.lateUntil.toISOString() : null,
    allowResubmission: assignment.allowResubmission,
    maxAttempts: assignment.maxAttempts,
    status: assignment.status,
    publishedAt: assignment.publishedAt ? assignment.publishedAt.toISOString() : null,
    closedAt: assignment.closedAt ? assignment.closedAt.toISOString() : null,
    cancelledAt: assignment.cancelledAt ? assignment.cancelledAt.toISOString() : null,
    cancellationReason: assignment.cancellationReason,
    attachments: assignment.attachments.map((attachment) => ({
      id: attachment._id.toString(),
      filename: attachment.filename,
      format: attachment.format,
      bytes: attachment.bytes,
    })),
    submittedCount: counts?.submitted ?? 0,
    gradedCount: counts?.graded ?? 0,
    pendingGradingCount: counts?.pendingGrading ?? 0,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }
}
