import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import {
  computeManualGradingProgress,
  finalizeAttemptScore,
} from '../utils/assessment-scoring.util'
import {
  toAttemptSummaryDto,
  toGraderAttemptDto,
  type AttemptSummaryDto,
  type GraderAttemptDto,
} from './assessment-attempt-dto'
import { assessmentRepository } from '../repositories/assessment.repository'
import {
  assessmentAttemptRepository,
  type AssessmentAttemptCounts,
} from '../repositories/assessment-attempt.repository'
import { studentRepository } from '../repositories/student.repository'
import { batchRepository } from '../repositories/batch.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { AssessmentDocument } from '../models/assessment.model'
import type { AssessmentAttemptDocument } from '../models/assessment-attempt.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  GradeAttemptInput,
  ListAttemptsQuery,
} from '../validators/assessment-attempt.validator'

const AUDIT_ENTITY_TYPE = 'assessment_attempt'
const MAX_LIST_ROWS = 2000

async function recordAudit(
  attemptId: string,
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
    entityId: attemptId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function requireAssessment(assessmentId: string): Promise<AssessmentDocument> {
  const assessment = await assessmentRepository.findById(assessmentId)
  if (!assessment) throw ApiError.notFound('Assessment not found')
  return assessment
}

/** A `:attemptId` must genuinely belong to its own `:id`/`assessmentId` — never disclose that an attempt id exists under the wrong assessment, same 404-not-403 rule `assignment-submission.service.ts#requireSubmissionUnderAssignment` established. */
async function requireAttemptUnderAssessment(
  assessmentId: string,
  attemptId: string,
): Promise<AssessmentAttemptDocument> {
  const attempt = await assessmentAttemptRepository.findById(attemptId)
  if (attempt?.assessmentId.toString() !== assessmentId) {
    throw ApiError.notFound('Attempt not found')
  }
  return attempt
}

/** Shared by both the admin (`assessments:grade` permission) and trainer (ownership of a target batch) namespaces after their own, separate authorization check — never a parallel grading code path, mirrors `assignment-submission.service.ts`'s own precedent exactly. */
export const assessmentGradingService = {
  async listAttempts(
    assessmentId: string,
    filter: ListAttemptsQuery,
  ): Promise<AttemptSummaryDto[]> {
    await requireAssessment(assessmentId)
    const attempts = await assessmentAttemptRepository.findLatestAttemptsByAssessment(assessmentId)

    const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId.toString()))]
    const students = await studentRepository.findByIds(studentIds)
    const studentById = new Map(students.map((student) => [student._id.toString(), student]))

    let dtos: AttemptSummaryDto[] = []
    for (const attempt of attempts) {
      const student = studentById.get(attempt.studentId.toString())
      if (!student) continue
      dtos.push(toAttemptSummaryDto(attempt, student))
    }

    if (filter.status) dtos = dtos.filter((dto) => dto.status === filter.status)
    if (filter.passStatus) dtos = dtos.filter((dto) => dto.passStatus === filter.passStatus)
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

  async getAttempt(assessmentId: string, attemptId: string): Promise<GraderAttemptDto> {
    const attempt = await requireAttemptUnderAssessment(assessmentId, attemptId)
    const [assessment, student] = await Promise.all([
      requireAssessment(assessmentId),
      studentRepository.findById(attempt.studentId.toString()),
    ])
    if (!student) throw ApiError.notFound('Attempt not found')
    return toGraderAttemptDto(attempt, assessment, student)
  },

  /** Attempt lookup by id alone, ownership resolved by the caller from the attempt's own `assessmentId` — the trainer namespace's flat `/trainer/assessment-attempts/:attemptId` shape (task's own suggested endpoint). */
  async getAttemptById(attemptId: string): Promise<AssessmentAttemptDocument> {
    const attempt = await assessmentAttemptRepository.findById(attemptId)
    if (!attempt) throw ApiError.notFound('Attempt not found')
    return attempt
  },

  async getResultsSummary(assessmentId: string): Promise<AssessmentAttemptCounts> {
    await requireAssessment(assessmentId)
    const map = await assessmentAttemptRepository.countsByAssessmentIds([assessmentId])
    return (
      map.get(assessmentId) ?? {
        totalAttempts: 0,
        pendingGrading: 0,
        graded: 0,
        passed: 0,
        failed: 0,
      }
    )
  },

  /**
   * Batch-saves every subjective question's marks/feedback in one call
   * (never one request per question — API-STANDARDS.md §4's "compact,
   * whole-set" contract). Can be called multiple times while grading is
   * still in progress; only auto-finalizes to `GRADED` once every manual
   * question in the snapshot has a saved `marksAwarded` (task's own
   * "After all manual questions graded: ... becomes GRADED" rule) — never a
   * separate explicit "finalize" click.
   */
  async gradeAttempt(
    assessmentId: string,
    attemptId: string,
    input: GradeAttemptInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<GraderAttemptDto> {
    const attempt = await requireAttemptUnderAssessment(assessmentId, attemptId)
    if (attempt.status !== 'PENDING_MANUAL_GRADING' && attempt.status !== 'GRADED') {
      throw ApiError.conflict('Only a submitted attempt awaiting or already graded can be graded')
    }
    const assessment = await requireAssessment(assessmentId)

    const snapshotByQuestionId = new Map(
      attempt.questionSnapshot.map((question) => [question.questionId.toString(), question]),
    )
    const answers = attempt.answers.map((answer) => ({ ...answer }))
    const answerByQuestionId = new Map(
      answers.map((answer) => [answer.questionId.toString(), answer]),
    )

    for (const grade of input.grades) {
      const question = snapshotByQuestionId.get(grade.questionId)
      if (!question?.requiresManualGrading) {
        throw ApiError.badRequest(
          `Question ${grade.questionId} is not a manually-graded question on this attempt`,
        )
      }
      if (grade.marksAwarded > question.marks) {
        throw ApiError.badRequest(
          `Marks awarded for a question cannot exceed its own max marks (${String(question.marks)})`,
        )
      }
      const existing = answerByQuestionId.get(grade.questionId)
      if (existing) {
        existing.marksAwarded = grade.marksAwarded
        existing.manualFeedback = grade.feedback ?? null
      } else {
        const fresh = {
          questionId: question.questionId,
          selectedOptionIds: [],
          booleanAnswer: null,
          textAnswer: null,
          numericAnswer: null,
          answeredAt: null,
          flaggedForReview: false,
          marksAwarded: grade.marksAwarded,
          isCorrect: null,
          manualFeedback: grade.feedback ?? null,
        }
        answers.push(fresh)
        answerByQuestionId.set(grade.questionId, fresh)
      }
    }

    const { manualMarks, allManualGraded } = computeManualGradingProgress(
      attempt.questionSnapshot,
      answers,
    )

    const update: Record<string, unknown> = { answers, updatedBy: actor.id }
    if (allManualGraded) {
      const finalized = finalizeAttemptScore(
        attempt.objectiveMarks ?? 0,
        manualMarks,
        assessment.totalMarks,
        assessment.passingPercentage,
      )
      update.status = 'GRADED'
      update.manualMarks = finalized.manualMarks
      update.totalMarksAwarded = finalized.totalMarksAwarded
      update.percentage = finalized.percentage
      update.passStatus = finalized.passStatus
      update.gradedBy = actor.id
      update.gradedAt = new Date()
      if (assessment.showResultImmediately) update.resultVisibleAt = new Date()
    } else {
      update.manualMarks = manualMarks
    }

    const updated = await assessmentAttemptRepository.updateById(attemptId, update)
    if (!updated) throw ApiError.notFound('Attempt not found')

    await recordAudit(attemptId, 'assessment.manual_grade_saved', actor, context, {
      questionsGraded: input.grades.length,
    })
    if (allManualGraded) {
      await recordAudit(attemptId, 'assessment.grading_completed', actor, context)
    }

    const student = await studentRepository.findById(updated.studentId.toString())
    if (!student) throw ApiError.notFound('Attempt not found')
    return toGraderAttemptDto(updated, assessment, student)
  },

  /**
   * Admin/authorized-trainer CSV export — one assessment if `assessmentId`
   * is given, otherwise every assessment matching `courseId`/`batchId`
   * (bounded to `MAX_LIST_ROWS`). No raw answers — only the summary columns
   * the task's own "Results Export" section names, matching the same
   * "no private detail in CSV" posture `assignment-submission.service.ts#
   * exportSubmissionsCsv` established.
   */
  async exportResultsCsv(filter: {
    assessmentId?: string
    courseId?: string
    batchId?: string
  }): Promise<string> {
    const assessments = filter.assessmentId
      ? [await requireAssessment(filter.assessmentId)]
      : (
          await assessmentRepository.list(
            { courseId: filter.courseId, batchId: filter.batchId },
            { page: 1, limit: MAX_LIST_ROWS, sortField: 'createdAt', sortDirection: 'desc' },
          )
        ).rows

    const rows: string[][] = []
    for (const assessment of assessments) {
      const attempts = await assessmentAttemptRepository.findLatestAttemptsByAssessment(
        assessment._id.toString(),
      )
      const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId.toString()))]
      const students = await studentRepository.findByIds(studentIds)
      const studentById = new Map(students.map((student) => [student._id.toString(), student]))
      const batchIds = [...new Set(attempts.map((attempt) => attempt.batchId.toString()))]
      const batches = await batchRepository.findByIds(batchIds)
      const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

      for (const attempt of attempts) {
        const student = studentById.get(attempt.studentId.toString())
        if (!student) continue
        const batch = batchById.get(attempt.batchId.toString())
        rows.push([
          student.studentId,
          `${student.firstName} ${student.lastName}`.trim(),
          batch?.name ?? '',
          assessment.title,
          String(attempt.attemptNumber),
          attempt.status,
          attempt.submittedAt ? attempt.submittedAt.toISOString() : '',
          attempt.objectiveMarks === null ? '' : String(attempt.objectiveMarks),
          attempt.manualMarks === null ? '' : String(attempt.manualMarks),
          attempt.totalMarksAwarded === null ? '' : String(attempt.totalMarksAwarded),
          attempt.percentage === null ? '' : String(attempt.percentage),
          attempt.passStatus ?? '',
        ])
      }
    }

    return toCsv(
      [
        'Student ID',
        'Student Name',
        'Batch',
        'Assessment',
        'Attempt',
        'Status',
        'Submitted At',
        'Objective Marks',
        'Manual Marks',
        'Total',
        'Percentage',
        'Pass/Fail',
      ],
      rows,
    )
  },
}
