import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import { assignmentRepository } from '../repositories/assignment.repository'
import { assignmentSubmissionRepository } from '../repositories/assignment-submission.repository'
import { studentRepository } from '../repositories/student.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import {
  toAssignmentSubmissionDto,
  type AssignmentSubmissionDto,
} from './assignment-submission-dto'
import type { AssignmentDocument } from '../models/assignment.model'
import type { AssignmentSubmissionDocument } from '../models/assignment-submission.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  GradeSubmissionInput,
  ReturnSubmissionInput,
} from '../validators/assignment-submission.validator'

const AUDIT_ENTITY_TYPE = 'assignment_submission'
const MAX_LIST_ROWS = 2000

async function recordAudit(
  submissionId: string,
  action: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId: submissionId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function requireAssignment(assignmentId: string): Promise<AssignmentDocument> {
  const assignment = await assignmentRepository.findById(assignmentId)
  if (!assignment) throw ApiError.notFound('Assignment not found')
  return assignment
}

/** A URL's `:submissionId` must genuinely belong to its own `:id` (assignment) segment — never disclose that a submission id exists under the wrong assignment path, same 404-not-403 rule everywhere else uses. */
async function requireSubmissionUnderAssignment(
  assignmentId: string,
  submissionId: string,
): Promise<AssignmentSubmissionDocument> {
  const submission = await assignmentSubmissionRepository.findById(submissionId)
  if (submission?.assignmentId.toString() !== assignmentId) {
    throw ApiError.notFound('Submission not found')
  }
  return submission
}

export interface SubmissionListFilter {
  status?: 'SUBMITTED' | 'GRADED'
  lateOnly?: boolean
  search?: string
}

/**
 * The one grading/return implementation — both the admin (`assignments:grade`
 * permission) and trainer (ownership of a target batch) namespaces call
 * these same functions after their own, separate authorization check, never
 * a parallel grading code path.
 */
export const assignmentSubmissionService = {
  /** Latest attempt per student for one assignment — a grading workspace's own roster. In-memory filter/search over a bounded result set, same precedent Phase 12's attendance report established (never unbounded, capped at `MAX_LIST_ROWS`). */
  async listSubmissions(
    assignmentId: string,
    filter: SubmissionListFilter,
  ): Promise<AssignmentSubmissionDto[]> {
    const assignment = await requireAssignment(assignmentId)
    const submissions =
      await assignmentSubmissionRepository.findLatestAttemptsByAssignment(assignmentId)

    const studentIds = [
      ...new Set(submissions.map((submission) => submission.studentId.toString())),
    ]
    const students = await studentRepository.findByIds(studentIds)
    const studentById = new Map(students.map((student) => [student._id.toString(), student]))

    let dtos: AssignmentSubmissionDto[] = []
    for (const submission of submissions) {
      const student = studentById.get(submission.studentId.toString())
      if (!student) continue
      dtos.push(
        toAssignmentSubmissionDto(
          submission,
          student,
          assignment.maxMarks,
          assignment.passingMarks,
        ),
      )
    }

    if (filter.status) dtos = dtos.filter((dto) => dto.status === filter.status)
    if (filter.lateOnly) dtos = dtos.filter((dto) => dto.submittedLate)
    if (filter.search) {
      const needle = filter.search.trim().toLowerCase()
      dtos = dtos.filter(
        (dto) =>
          dto.studentName.toLowerCase().includes(needle) ||
          dto.studentCode.toLowerCase().includes(needle),
      )
    }

    return dtos.slice(0, MAX_LIST_ROWS)
  },

  async getSubmission(
    assignmentId: string,
    submissionId: string,
  ): Promise<AssignmentSubmissionDto> {
    const submission = await requireSubmissionUnderAssignment(assignmentId, submissionId)
    const [assignment, student] = await Promise.all([
      requireAssignment(assignmentId),
      studentRepository.findById(submission.studentId.toString()),
    ])
    if (!student) throw ApiError.notFound('Submission not found')
    return toAssignmentSubmissionDto(
      submission,
      student,
      assignment.maxMarks,
      assignment.passingMarks,
    )
  },

  /** Every attempt for one student on one assignment, newest first — the "Attempt History" drill-down. */
  async getAttemptHistory(
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmissionDto[]> {
    const assignment = await requireAssignment(assignmentId)
    const student = await studentRepository.findById(studentId)
    if (!student) throw ApiError.notFound('Student not found')

    const attempts = await assignmentSubmissionRepository.findAttemptsByAssignmentAndStudent(
      assignmentId,
      studentId,
    )
    return attempts
      .filter((attempt) => attempt.status !== 'DRAFT')
      .map((attempt) =>
        toAssignmentSubmissionDto(attempt, student, assignment.maxMarks, assignment.passingMarks),
      )
  },

  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    input: GradeSubmissionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AssignmentSubmissionDto> {
    const submission = await requireSubmissionUnderAssignment(assignmentId, submissionId)
    if (submission.status === 'DRAFT') throw ApiError.conflict('This attempt was never submitted')

    const assignment = await requireAssignment(assignmentId)
    if (input.marksAwarded > assignment.maxMarks) {
      throw ApiError.badRequest(
        `Marks awarded cannot exceed the assignment's max marks (${String(assignment.maxMarks)})`,
      )
    }

    const updated = await assignmentSubmissionRepository.updateById(submissionId, {
      status: 'GRADED',
      marksAwarded: input.marksAwarded,
      feedback: input.feedback ?? null,
      gradedBy: actor.id,
      gradedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    await recordAudit(submissionId, 'assignment_submission.graded', actor, context, {
      marksAwarded: input.marksAwarded,
    })

    const student = await studentRepository.findById(updated.studentId.toString())
    if (!student) throw ApiError.notFound('Submission not found')
    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  /**
   * `allowResubmission` on the assignment gates a `TRAINER`; an
   * `ADMIN`/`SUPER_ADMIN` may always override (task's own explicit rule).
   * Never erases `marksAwarded`/`feedback` already on this attempt — the
   * grading history stays visible even after it's returned.
   */
  async returnSubmission(
    assignmentId: string,
    submissionId: string,
    input: ReturnSubmissionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
    canOverride: boolean,
  ): Promise<AssignmentSubmissionDto> {
    const submission = await requireSubmissionUnderAssignment(assignmentId, submissionId)
    if (submission.status !== 'SUBMITTED' && submission.status !== 'GRADED') {
      throw ApiError.conflict('Only a submitted or graded attempt can be returned')
    }

    const assignment = await requireAssignment(assignmentId)
    if (!assignment.allowResubmission && !canOverride) {
      throw ApiError.conflict('This assignment does not allow resubmission')
    }

    const updated = await assignmentSubmissionRepository.updateById(submissionId, {
      status: 'RETURNED',
      returnedAt: new Date(),
      returnReason: input.reason,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Submission not found')

    await recordAudit(submissionId, 'assignment_submission.returned', actor, context, {
      reason: input.reason,
    })

    const student = await studentRepository.findById(updated.studentId.toString())
    if (!student) throw ApiError.notFound('Submission not found')
    return toAssignmentSubmissionDto(updated, student, assignment.maxMarks, assignment.passingMarks)
  },

  /**
   * Admin/authorized-trainer CSV export — one assignment if `assignmentId`
   * is given, otherwise every assignment matching `courseId`/`batchId`
   * (bounded to `MAX_LIST_ROWS` assignments, each contributing its latest-
   * attempt-per-student rows). Never includes a file URL — only metadata,
   * matching the task's own "no private file URLs in export" rule.
   */
  async exportSubmissionsCsv(filter: {
    assignmentId?: string
    courseId?: string
    batchId?: string
  }): Promise<string> {
    const assignments = filter.assignmentId
      ? [await requireAssignment(filter.assignmentId)]
      : (
          await assignmentRepository.list(
            { courseId: filter.courseId, batchId: filter.batchId },
            { page: 1, limit: MAX_LIST_ROWS, sortField: 'dueDateTime', sortDirection: 'desc' },
          )
        ).rows

    const rows: string[][] = []
    for (const assignment of assignments) {
      const submissions = await assignmentSubmissionRepository.findLatestAttemptsByAssignment(
        assignment._id.toString(),
      )
      const studentIds = [
        ...new Set(submissions.map((submission) => submission.studentId.toString())),
      ]
      const students = await studentRepository.findByIds(studentIds)
      const studentById = new Map(students.map((student) => [student._id.toString(), student]))

      for (const submission of submissions) {
        const student = studentById.get(submission.studentId.toString())
        if (!student) continue
        const dto = toAssignmentSubmissionDto(
          submission,
          student,
          assignment.maxMarks,
          assignment.passingMarks,
        )
        rows.push([
          dto.studentCode,
          dto.studentName,
          assignment.assignmentCode,
          assignment.title,
          String(dto.attemptNumber),
          dto.submittedAt ?? '',
          dto.submittedLate ? 'Yes' : 'No',
          dto.marksAwarded === null ? '' : String(dto.marksAwarded),
          dto.percentage === null ? '' : String(dto.percentage),
          dto.status,
        ])
      }
    }

    return toCsv(
      [
        'Student ID',
        'Student Name',
        'Assignment Code',
        'Assignment',
        'Attempt',
        'Submitted At',
        'Late',
        'Marks',
        'Percentage',
        'Grade Status',
      ],
      rows,
    )
  },
}
