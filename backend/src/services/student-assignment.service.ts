import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import {
  isAssignmentAcceptingSubmissions,
  isAssignmentStudentVisible,
} from '../utils/assignment-lifecycle.util'
import { generateSubmissionCode } from './assignment-submission-id.service'
import {
  ALLOWED_RESOURCE_FORMATS,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { resolveMimeType } from '../utils/lesson-resource-format.util'
import { resolveStudentForUser } from './student-identity.util'
import { hasLearningAccess } from './enrollment-access.service'
import {
  toStudentAssignmentDetailDto,
  toStudentAssignmentDto,
  type StudentAssignmentDetailDto,
  type StudentAssignmentDto,
} from './student-assignment-dto'
import {
  toAssignmentSubmissionDto,
  type AssignmentSubmissionDto,
} from './assignment-submission-dto'
import { assignmentRepository } from '../repositories/assignment.repository'
import { assignmentSubmissionRepository } from '../repositories/assignment-submission.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import type { AssignmentDocument } from '../models/assignment.model'
import type { AssignmentSubmissionDocument } from '../models/assignment-submission.model'
import type { EnrollmentDocument } from '../models/enrollment.model'
import type { StudentDocument } from '../models/student.model'
import type {
  SaveDraftInput,
  SubmitAssignmentInput,
  UploadFileInput,
} from '../validators/student-assignment.validator'

const MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024

function submissionFilesFolder(
  assignmentId: string,
  studentId: string,
  attemptNumber: number,
): string {
  return `daisy-minds/assignments/${assignmentId}/students/${studentId}/attempts/${String(attemptNumber)}`
}

/** A student is enrolled in at most one batch per course (existing enrollment-uniqueness rule) — so exactly one of a course's batches can ever be "the" batch a given assignment maps to for this student. */
async function resolveStudentBatchForAssignment(
  studentId: string,
  assignment: AssignmentDocument,
): Promise<EnrollmentDocument | null> {
  const enrollments = await enrollmentRepository.findAllByStudent(studentId)
  const batchIdSet = new Set(assignment.batchIds.map((id) => id.toString()))
  return (
    enrollments.find(
      (enrollment) =>
        enrollment.courseId.toString() === assignment.courseId.toString() &&
        batchIdSet.has(enrollment.batchId.toString()) &&
        hasLearningAccess(enrollment),
    ) ?? null
  )
}

function assertWithinSubmissionWindow(assignment: AssignmentDocument, now: Date): void {
  if (now <= assignment.dueDateTime) return
  if (assignment.allowLateSubmission && (!assignment.lateUntil || now <= assignment.lateUntil))
    return
  throw ApiError.conflict('The submission window for this assignment has closed')
}

function computeCanSubmit(
  assignment: AssignmentDocument,
  latestAttempt: AssignmentSubmissionDocument | null,
  attemptCount: number,
  now: Date,
): boolean {
  if (!isAssignmentAcceptingSubmissions(assignment.status)) return false
  const withinWindow =
    now <= assignment.dueDateTime ||
    (assignment.allowLateSubmission && (!assignment.lateUntil || now <= assignment.lateUntil))
  if (!withinWindow) return false

  if (!latestAttempt || latestAttempt.status === 'DRAFT') return true
  if (latestAttempt.status === 'RETURNED') return true

  // Only `SUBMITTED`/`GRADED` remain at this point — a voluntary resubmission,
  // gated by the assignment's own resubmission rules (never automatic).
  if (!assignment.allowResubmission) return false
  return assignment.maxAttempts === null || attemptCount < assignment.maxAttempts
}

/**
 * Reuses (and updates in place) an existing `DRAFT` attempt, or creates the
 * next attempt when the current one is `RETURNED`/`SUBMITTED`/`GRADED` and
 * the assignment's own resubmission rules allow it. Never mutates a
 * `SUBMITTED`/`GRADED` document directly — that would silently erase
 * grading history (task's own explicit instruction).
 */
async function getOrCreateWorkingAttempt(
  assignment: AssignmentDocument,
  student: StudentDocument,
  enrollment: EnrollmentDocument,
): Promise<AssignmentSubmissionDocument> {
  const latest = await assignmentSubmissionRepository.findLatestAttemptByAssignmentAndStudent(
    assignment._id.toString(),
    student._id.toString(),
  )
  if (latest?.status === 'DRAFT') return latest

  const attemptCount = await assignmentSubmissionRepository.countAttemptsByAssignmentAndStudent(
    assignment._id.toString(),
    student._id.toString(),
  )
  if (!computeCanSubmit(assignment, latest, attemptCount, new Date())) {
    throw ApiError.conflict('A new attempt is not allowed for this assignment right now')
  }

  const submissionCode = await generateSubmissionCode()
  return assignmentSubmissionRepository.create({
    submissionCode,
    assignmentId: assignment._id,
    studentId: student._id,
    enrollmentId: enrollment._id,
    courseId: assignment.courseId,
    batchId: enrollment.batchId,
    attemptNumber: (latest?.attemptNumber ?? 0) + 1,
    status: 'DRAFT',
    createdBy: student.userId,
  })
}

async function requireVisibleAssignmentForStudent(
  userId: string,
  assignmentId: string,
): Promise<{
  assignment: AssignmentDocument
  student: StudentDocument
  enrollment: EnrollmentDocument
}> {
  const student = await resolveStudentForUser(userId)
  const assignment = await assignmentRepository.findById(assignmentId)
  if (!assignment || !isAssignmentStudentVisible(assignment.status)) {
    throw ApiError.notFound('Assignment not found')
  }
  const enrollment = await resolveStudentBatchForAssignment(student._id.toString(), assignment)
  if (!enrollment) throw ApiError.notFound('Assignment not found')
  return { assignment, student, enrollment }
}

async function buildStudentDto(
  assignment: AssignmentDocument,
  courseTitle: string,
  batchName: string,
  batchId: string,
  student: StudentDocument,
): Promise<StudentAssignmentDto> {
  const [latestAttempt, attemptCount] = await Promise.all([
    assignmentSubmissionRepository.findLatestAttemptByAssignmentAndStudent(
      assignment._id.toString(),
      student._id.toString(),
    ),
    assignmentSubmissionRepository.countAttemptsByAssignmentAndStudent(
      assignment._id.toString(),
      student._id.toString(),
    ),
  ])
  const canSubmit = computeCanSubmit(assignment, latestAttempt, attemptCount, new Date())
  return toStudentAssignmentDto(
    assignment,
    courseTitle,
    batchId,
    batchName,
    latestAttempt,
    canSubmit,
  )
}

export const studentAssignmentService = {
  async listMyAssignments(userId: string): Promise<StudentAssignmentDto[]> {
    const student = await resolveStudentForUser(userId)
    const enrollments = await enrollmentRepository.findAllByStudent(student._id.toString())
    const accessibleEnrollments = enrollments.filter((enrollment) => hasLearningAccess(enrollment))
    const batchIds = [
      ...new Set(accessibleEnrollments.map((enrollment) => enrollment.batchId.toString())),
    ]

    const assignments = await assignmentRepository.findForBatches(batchIds)
    if (assignments.length === 0) return []

    const courseIds = [...new Set(assignments.map((assignment) => assignment.courseId.toString()))]
    const relevantBatchIds = [
      ...new Set(
        assignments.flatMap((assignment) => assignment.batchIds.map((id) => id.toString())),
      ),
    ]
    const [courses, batches] = await Promise.all([
      courseRepository.findByIds(courseIds),
      batchRepository.findByIds(relevantBatchIds),
    ])
    const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
    const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))
    const enrollmentByBatchId = new Map(
      accessibleEnrollments.map((enrollment) => [enrollment.batchId.toString(), enrollment]),
    )

    const dtos: StudentAssignmentDto[] = []
    for (const assignment of assignments) {
      const course = courseById.get(assignment.courseId.toString())
      if (!course) continue
      const matchingBatchId = assignment.batchIds
        .map((id) => id.toString())
        .find((batchId) => enrollmentByBatchId.has(batchId))
      if (!matchingBatchId) continue
      const batch = batchById.get(matchingBatchId)
      if (!batch) continue

      dtos.push(
        await buildStudentDto(assignment, course.title, batch.name, matchingBatchId, student),
      )
    }

    return dtos.sort((a, b) => a.dueDateTime.localeCompare(b.dueDateTime))
  },

  async getMyAssignment(userId: string, assignmentId: string): Promise<StudentAssignmentDetailDto> {
    const { assignment, student, enrollment } = await requireVisibleAssignmentForStudent(
      userId,
      assignmentId,
    )
    const [course, batch] = await Promise.all([
      courseRepository.findById(assignment.courseId.toString()),
      batchRepository.findById(enrollment.batchId.toString()),
    ])
    if (!course || !batch) throw ApiError.notFound('Assignment not found')

    const base = await buildStudentDto(
      assignment,
      course.title,
      batch.name,
      batch._id.toString(),
      student,
    )
    return toStudentAssignmentDetailDto(base, assignment)
  },

  /**
   * Unlike the admin/trainer grading-history read (`assignment-submission.
   * service.ts#getAttemptHistory`, which deliberately excludes `DRAFT` —
   * an in-progress draft has nothing to grade), a student's own history
   * **includes** their current `DRAFT` (sorted first, since attempts sort
   * by `attemptNumber` descending) — this is the only endpoint that lets
   * the submission form resume a draft's content after a page reload.
   */
  async getMyAttemptHistory(
    userId: string,
    assignmentId: string,
  ): Promise<AssignmentSubmissionDto[]> {
    const { assignment, student } = await requireVisibleAssignmentForStudent(userId, assignmentId)
    const attempts = await assignmentSubmissionRepository.findAttemptsByAssignmentAndStudent(
      assignmentId,
      student._id.toString(),
    )
    return attempts.map((attempt) =>
      toAssignmentSubmissionDto(attempt, student, assignment.maxMarks, assignment.passingMarks),
    )
  },

  async saveDraft(
    userId: string,
    assignmentId: string,
    input: SaveDraftInput,
  ): Promise<AssignmentSubmissionDto> {
    const { assignment, student, enrollment } = await requireVisibleAssignmentForStudent(
      userId,
      assignmentId,
    )
    assertWithinSubmissionWindow(assignment, new Date())

    const attempt = await getOrCreateWorkingAttempt(assignment, student, enrollment)
    const updated = await assignmentSubmissionRepository.updateById(attempt._id.toString(), {
      textResponse: input.textResponse ?? attempt.textResponse,
      linkResponse: input.linkResponse ?? attempt.linkResponse,
      updatedBy: student.userId,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  async submitAssignment(
    userId: string,
    assignmentId: string,
    input: SubmitAssignmentInput,
  ): Promise<AssignmentSubmissionDto> {
    const { assignment, student, enrollment } = await requireVisibleAssignmentForStudent(
      userId,
      assignmentId,
    )
    const now = new Date()
    assertWithinSubmissionWindow(assignment, now)

    const attempt = await getOrCreateWorkingAttempt(assignment, student, enrollment)
    const textResponse = input.textResponse ?? attempt.textResponse
    const linkResponse = input.linkResponse ?? attempt.linkResponse

    if (assignment.submissionType === 'TEXT' && !textResponse?.trim()) {
      throw ApiError.badRequest('A text response is required for this assignment')
    }
    if (assignment.submissionType === 'LINK' && !linkResponse?.trim()) {
      throw ApiError.badRequest('A link response is required for this assignment')
    }
    if (assignment.submissionType === 'FILE' && attempt.files.length === 0) {
      throw ApiError.badRequest('At least one file is required for this assignment')
    }
    if (
      assignment.submissionType === 'MIXED' &&
      !textResponse?.trim() &&
      !linkResponse?.trim() &&
      attempt.files.length === 0
    ) {
      throw ApiError.badRequest('At least one response (text, link, or file) is required')
    }

    const submittedLate = now > assignment.dueDateTime

    const updated = await assignmentSubmissionRepository.updateById(attempt._id.toString(), {
      textResponse,
      linkResponse,
      status: 'SUBMITTED',
      submittedAt: now,
      submittedLate,
      // A fresh attempt following a RETURNED/GRADED one starts clean — never carries the previous attempt's grade forward.
      marksAwarded: null,
      feedback: null,
      gradedBy: null,
      gradedAt: null,
      returnedAt: null,
      returnReason: null,
      updatedBy: student.userId,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  async getFileUploadSignature(userId: string, assignmentId: string): Promise<SignedUploadParams> {
    const { assignment, student, enrollment } = await requireVisibleAssignmentForStudent(
      userId,
      assignmentId,
    )
    assertWithinSubmissionWindow(assignment, new Date())
    if (assignment.submissionType !== 'FILE' && assignment.submissionType !== 'MIXED') {
      throw ApiError.conflict('This assignment does not accept file submissions')
    }

    const attempt = await getOrCreateWorkingAttempt(assignment, student, enrollment)
    if (attempt.files.length >= assignment.maxFiles) {
      throw ApiError.unprocessable(
        `This assignment accepts at most ${String(assignment.maxFiles)} file(s)`,
      )
    }

    const allowedFormats =
      assignment.allowedFileTypes.length > 0
        ? assignment.allowedFileTypes
        : ALLOWED_RESOURCE_FORMATS
    const folder = submissionFilesFolder(
      assignmentId,
      student._id.toString(),
      attempt.attemptNumber,
    )
    const publicId = `${folder}/file-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId, {
      resourceType: 'raw',
      type: 'authenticated',
      allowedFormats,
      maxFileSize: Math.min(assignment.maxFileSizeBytes, MAX_SUBMISSION_FILE_BYTES),
    })
  },

  async confirmFile(
    userId: string,
    assignmentId: string,
    input: UploadFileInput,
  ): Promise<AssignmentSubmissionDto> {
    const { assignment, student, enrollment } = await requireVisibleAssignmentForStudent(
      userId,
      assignmentId,
    )
    assertWithinSubmissionWindow(assignment, new Date())

    const attempt = await getOrCreateWorkingAttempt(assignment, student, enrollment)
    if (attempt.files.length >= assignment.maxFiles) {
      throw ApiError.unprocessable(
        `This assignment accepts at most ${String(assignment.maxFiles)} file(s)`,
      )
    }

    const folder = submissionFilesFolder(
      assignmentId,
      student._id.toString(),
      attempt.attemptNumber,
    )
    const asset = await verifyUploadedAsset(input.publicId, folder, {
      resourceType: 'raw',
      type: 'authenticated',
      maxFileSize: Math.min(assignment.maxFileSizeBytes, MAX_SUBMISSION_FILE_BYTES),
    })

    if (
      assignment.allowedFileTypes.length > 0 &&
      !assignment.allowedFileTypes.includes(asset.format.toLowerCase())
    ) {
      throw ApiError.badRequest(`File type .${asset.format} is not accepted for this assignment`)
    }

    const updated = await assignmentSubmissionRepository.updateById(attempt._id.toString(), {
      $push: {
        files: {
          publicId: input.publicId,
          assetId: asset.assetId,
          filename: input.filename,
          format: asset.format,
          mimeType: resolveMimeType(asset.format),
          bytes: asset.bytes,
        },
      },
      updatedBy: student.userId,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  async removeFile(
    userId: string,
    assignmentId: string,
    fileId: string,
  ): Promise<AssignmentSubmissionDto> {
    const { assignment, student } = await requireVisibleAssignmentForStudent(userId, assignmentId)

    const attempt = await assignmentSubmissionRepository.findLatestAttemptByAssignmentAndStudent(
      assignmentId,
      student._id.toString(),
    )
    if (attempt?.status !== 'DRAFT') {
      throw ApiError.conflict('Only a file on your current draft can be removed')
    }
    const file = attempt.files.find((item) => item._id.toString() === fileId)
    if (!file) throw ApiError.notFound('File not found')

    const updated = await assignmentSubmissionRepository.updateById(attempt._id.toString(), {
      $pull: { files: { _id: new Types.ObjectId(fileId) } },
      updatedBy: student.userId,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  /** A student's own uploaded file, or an assignment resource — both scoped to an assignment this student can see. */
  async getAssignmentAttachmentDeliveryUrl(
    userId: string,
    assignmentId: string,
    attachmentId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const { assignment } = await requireVisibleAssignmentForStudent(userId, assignmentId)
    const attachment = assignment.attachments.find((item) => item._id.toString() === attachmentId)
    if (!attachment) throw ApiError.notFound('Attachment not found')

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(attachment.publicId, {
      resourceType: 'raw',
      format: attachment.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },

  async getSubmissionFileDeliveryUrl(
    userId: string,
    assignmentId: string,
    fileId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const { student } = await requireVisibleAssignmentForStudent(userId, assignmentId)
    const attempts = await assignmentSubmissionRepository.findAttemptsByAssignmentAndStudent(
      assignmentId,
      student._id.toString(),
    )
    const file = attempts
      .flatMap((attempt) => attempt.files)
      .find((item) => item._id.toString() === fileId)
    if (!file) throw ApiError.notFound('File not found')

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(file.publicId, {
      resourceType: 'raw',
      format: file.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },
}
