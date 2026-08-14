import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import {
  isAssessmentAcceptingAttempts,
  isAssessmentStudentVisible,
} from '../utils/assessment-lifecycle.util'
import { requiresManualGrading, computeAttemptExpiry } from '../utils/assessment-scoring.util'
import { shuffleArray } from '../utils/shuffle.util'
import { generateAttemptCode } from './assessment-attempt-id.service'
import {
  finalizeAttemptSubmission,
  materializeAttemptExpiry,
} from './assessment-attempt-finalize.service'
import { toStudentAttemptDto, type StudentAttemptDto } from './assessment-attempt-dto'
import {
  toStudentAssessmentDetailDto,
  toStudentAssessmentDto,
  type StudentAssessmentDetailDto,
  type StudentAssessmentDto,
} from './student-assessment-dto'
import { resolveStudentForUser } from './student-identity.util'
import { hasLearningAccess } from './enrollment-access.service'
import { assessmentRepository } from '../repositories/assessment.repository'
import { assessmentAttemptRepository } from '../repositories/assessment-attempt.repository'
import { questionRepository } from '../repositories/question.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { AssessmentDocument } from '../models/assessment.model'
import type {
  AssessmentAttemptDocument,
  IAssessmentAttemptQuestionSnapshot,
} from '../models/assessment-attempt.model'
import type { EnrollmentDocument } from '../models/enrollment.model'
import type { StudentDocument } from '../models/student.model'
import type { QuestionDocument } from '../models/question.model'
import type { SaveAnswersInput } from '../validators/student-assessment.validator'

interface MongoDuplicateKeyError extends Error {
  code: number
}

function isDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    error instanceof Error &&
    error.name === 'MongoServerError' &&
    (error as { code?: unknown }).code === 11000
  )
}

/** A student is enrolled in at most one batch per course (existing enrollment-uniqueness rule) — mirrors `student-assignment.service.ts#resolveStudentBatchForAssignment` exactly. */
async function resolveStudentBatchForAssessment(
  studentId: string,
  assessment: AssessmentDocument,
): Promise<EnrollmentDocument | null> {
  const enrollments = await enrollmentRepository.findAllByStudent(studentId)
  const batchIdSet = new Set(assessment.batchIds.map((id) => id.toString()))
  return (
    enrollments.find(
      (enrollment) =>
        enrollment.courseId.toString() === assessment.courseId.toString() &&
        batchIdSet.has(enrollment.batchId.toString()) &&
        hasLearningAccess(enrollment),
    ) ?? null
  )
}

async function requireVisibleAssessmentForStudent(
  userId: string,
  assessmentId: string,
): Promise<{
  assessment: AssessmentDocument
  student: StudentDocument
  enrollment: EnrollmentDocument
}> {
  const student = await resolveStudentForUser(userId)
  const assessment = await assessmentRepository.findById(assessmentId)
  if (!assessment || !isAssessmentStudentVisible(assessment.status)) {
    throw ApiError.notFound('Assessment not found')
  }
  const enrollment = await resolveStudentBatchForAssessment(student._id.toString(), assessment)
  if (!enrollment) throw ApiError.notFound('Assessment not found')
  return { assessment, student, enrollment }
}

/** Resolves the section's fixed or randomly-drawn question ids and builds the frozen per-attempt snapshot — picked once, at attempt creation, never recomputed (task's own explicit "snapshot" requirement). */
async function buildQuestionSnapshot(
  assessment: AssessmentDocument,
): Promise<IAssessmentAttemptQuestionSnapshot[]> {
  const allQuestionIds = [
    ...new Set(
      assessment.sections.flatMap((section) => section.questionIds.map((id) => id.toString())),
    ),
  ]
  const questions = await questionRepository.findByIds(allQuestionIds)
  const questionById = new Map<string, QuestionDocument>(
    questions.map((question) => [question._id.toString(), question]),
  )

  const sections = [...assessment.sections].sort((a, b) => a.order - b.order)
  const snapshot: IAssessmentAttemptQuestionSnapshot[] = []
  let order = 0

  for (const section of sections) {
    let selectedIds = section.questionIds.map((id) => id.toString())
    if (section.randomQuestionCount) {
      selectedIds = shuffleArray(selectedIds).slice(0, section.randomQuestionCount)
    }
    if (assessment.shuffleQuestions) selectedIds = shuffleArray(selectedIds)

    for (const questionId of selectedIds) {
      const question = questionById.get(questionId)
      if (!question) continue
      const options = assessment.shuffleOptions ? shuffleArray(question.options) : question.options
      snapshot.push({
        questionId: question._id,
        sectionId: section._id,
        order: order++,
        questionType: question.questionType,
        questionText: question.questionText,
        explanation: question.explanation,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        requiresManualGrading: requiresManualGrading(question),
        options: options.map((option) => ({
          _id: option._id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        correctBoolean: question.correctBoolean,
        acceptedAnswers: question.acceptedAnswers,
        correctNumericAnswer: question.correctNumericAnswer,
      })
    }
  }
  return snapshot
}

function assertAnswerBelongsToSnapshot(
  snapshot: IAssessmentAttemptQuestionSnapshot[],
  questionId: string,
  selectedOptionIds: string[] | undefined,
): IAssessmentAttemptQuestionSnapshot {
  const question = snapshot.find((item) => item.questionId.toString() === questionId)
  if (!question) throw ApiError.badRequest(`Question ${questionId} is not part of this attempt`)

  if (selectedOptionIds && selectedOptionIds.length > 0) {
    const validOptionIds = new Set(question.options.map((option) => option._id.toString()))
    const unknown = selectedOptionIds.find((id) => !validOptionIds.has(id))
    if (unknown) throw ApiError.badRequest(`Option ${unknown} is not part of this question`)
    if (question.questionType === 'SINGLE_CHOICE' && selectedOptionIds.length > 1) {
      throw ApiError.badRequest('SINGLE_CHOICE accepts at most one selected option')
    }
  }
  return question
}

async function requireOwnAttempt(
  userId: string,
  attemptId: string,
): Promise<{
  attempt: AssessmentAttemptDocument
  assessment: AssessmentDocument
  student: StudentDocument
}> {
  const student = await resolveStudentForUser(userId)
  const attempt = await assessmentAttemptRepository.findById(attemptId)
  if (attempt?.studentId.toString() !== student._id.toString()) {
    throw ApiError.notFound('Attempt not found')
  }
  const assessment = await assessmentRepository.findById(attempt.assessmentId.toString())
  if (!assessment) throw ApiError.notFound('Attempt not found')
  return { attempt, assessment, student }
}

export const studentAssessmentService = {
  async listMyAssessments(userId: string): Promise<StudentAssessmentDto[]> {
    const student = await resolveStudentForUser(userId)
    const enrollments = await enrollmentRepository.findAllByStudent(student._id.toString())
    const accessibleEnrollments = enrollments.filter((enrollment) => hasLearningAccess(enrollment))
    const batchIds = [
      ...new Set(accessibleEnrollments.map((enrollment) => enrollment.batchId.toString())),
    ]

    const assessments = await assessmentRepository.findForBatches(batchIds)
    if (assessments.length === 0) return []

    const courseIds = [...new Set(assessments.map((assessment) => assessment.courseId.toString()))]
    const relevantBatchIds = [
      ...new Set(
        assessments.flatMap((assessment) => assessment.batchIds.map((id) => id.toString())),
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

    const dtos: StudentAssessmentDto[] = []
    for (const assessment of assessments) {
      const course = courseById.get(assessment.courseId.toString())
      if (!course) continue
      const matchingBatchId = assessment.batchIds
        .map((id) => id.toString())
        .find((batchId) => enrollmentByBatchId.has(batchId))
      if (!matchingBatchId) continue
      const batch = batchById.get(matchingBatchId)
      if (!batch) continue

      const attempts = await assessmentAttemptRepository.findAttemptsByAssessmentAndStudent(
        assessment._id.toString(),
        student._id.toString(),
      )
      dtos.push(toStudentAssessmentDto(assessment, course.title, batch.name, attempts))
    }

    return dtos.sort((a, b) => (a.openAt ?? '').localeCompare(b.openAt ?? ''))
  },

  async getMyAssessment(userId: string, assessmentId: string): Promise<StudentAssessmentDetailDto> {
    const { assessment, student, enrollment } = await requireVisibleAssessmentForStudent(
      userId,
      assessmentId,
    )
    const [course, batch, attempts] = await Promise.all([
      courseRepository.findById(assessment.courseId.toString()),
      batchRepository.findById(enrollment.batchId.toString()),
      assessmentAttemptRepository.findAttemptsByAssessmentAndStudent(
        assessmentId,
        student._id.toString(),
      ),
    ])
    if (!course || !batch) throw ApiError.notFound('Assessment not found')

    const base = toStudentAssessmentDto(assessment, course.title, batch.name, attempts)
    return toStudentAssessmentDetailDto(base, assessment, attempts)
  },

  /**
   * Start or resume — the single entry point the "Start Assessment" /
   * "Resume" CTA calls. Every eligibility/timing/limit check happens
   * server-side (task's own explicit "Frontend must not determine these"
   * rule); the DB's own partial-unique-index (`assessment-attempt.model.ts`)
   * is the real defense against a duplicate-start race from two tabs — a
   * caught `11000` here means another request already won, so this simply
   * resumes whatever that request created instead of erroring.
   */
  async startOrResumeAttempt(userId: string, assessmentId: string): Promise<StudentAttemptDto> {
    const { assessment, student, enrollment } = await requireVisibleAssessmentForStudent(
      userId,
      assessmentId,
    )

    const existing = await assessmentAttemptRepository.findInProgressByAssessmentAndStudent(
      assessmentId,
      student._id.toString(),
    )
    if (existing) {
      const materialized = await materializeAttemptExpiry(existing, assessment)
      if (materialized.status === 'IN_PROGRESS') {
        return toStudentAttemptDto(materialized, assessment)
      }
      // The previous attempt just auto-submitted due to expiry — fall through to consider a new one.
    }

    if (!isAssessmentAcceptingAttempts(assessment, new Date())) {
      throw ApiError.conflict('This assessment is not currently open for attempts')
    }

    const attemptCount = await assessmentAttemptRepository.countAttemptsByAssessmentAndStudent(
      assessmentId,
      student._id.toString(),
    )
    if (attemptCount >= assessment.maxAttempts) {
      throw ApiError.conflict('You have used all allowed attempts for this assessment')
    }

    const questionSnapshot = await buildQuestionSnapshot(assessment)
    if (questionSnapshot.length === 0) {
      throw ApiError.conflict('This assessment has no questions configured yet')
    }

    const startedAt = new Date()
    const expiresAt = computeAttemptExpiry(
      startedAt,
      assessment.durationMinutes,
      assessment.closeAt,
    )
    const attemptCode = await generateAttemptCode()

    try {
      const attempt = await assessmentAttemptRepository.create({
        attemptCode,
        assessmentId: assessment._id,
        studentId: student._id,
        enrollmentId: enrollment._id,
        courseId: assessment.courseId,
        batchId: enrollment.batchId,
        attemptNumber: attemptCount + 1,
        status: 'IN_PROGRESS',
        submissionMethod: null,
        startedAt,
        expiresAt,
        questionSnapshot,
        answers: [],
        focusLossCount: 0,
        createdBy: student.userId,
      })
      await auditLogRepository.record({
        actorId: student.userId.toString(),
        actorRole: 'STUDENT',
        action: 'assessment.attempt_started',
        entityType: 'assessment_attempt',
        entityId: attempt._id.toString(),
        metadata: { assessmentId: assessment._id.toString(), attemptNumber: attempt.attemptNumber },
        ipAddress: null,
        userAgent: null,
      })
      return toStudentAttemptDto(attempt, assessment)
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await assessmentAttemptRepository.findInProgressByAssessmentAndStudent(
          assessmentId,
          student._id.toString(),
        )
        if (raced) return toStudentAttemptDto(raced, assessment)
      }
      throw error
    }
  },

  async getMyAttempt(userId: string, attemptId: string): Promise<StudentAttemptDto> {
    const { attempt, assessment } = await requireOwnAttempt(userId, attemptId)
    const materialized = await materializeAttemptExpiry(attempt, assessment)
    return toStudentAttemptDto(materialized, assessment)
  },

  async saveAnswers(
    userId: string,
    attemptId: string,
    input: SaveAnswersInput,
  ): Promise<{ savedAt: string }> {
    const { attempt, assessment, student } = await requireOwnAttempt(userId, attemptId)
    const materialized = await materializeAttemptExpiry(attempt, assessment)
    if (materialized.status !== 'IN_PROGRESS') {
      throw ApiError.conflict('This attempt is no longer in progress')
    }

    const now = new Date()
    const byQuestionId = new Map(
      materialized.answers.map((answer) => [answer.questionId.toString(), { ...answer }]),
    )

    for (const entry of input.answers) {
      assertAnswerBelongsToSnapshot(
        materialized.questionSnapshot,
        entry.questionId,
        entry.selectedOptionIds,
      )
      const current = byQuestionId.get(entry.questionId) ?? {
        questionId: new Types.ObjectId(entry.questionId),
        selectedOptionIds: [],
        booleanAnswer: null,
        textAnswer: null,
        numericAnswer: null,
        answeredAt: null,
        flaggedForReview: false,
        marksAwarded: null,
        isCorrect: null,
        manualFeedback: null,
      }
      if (entry.selectedOptionIds !== undefined) {
        current.selectedOptionIds = entry.selectedOptionIds.map((id) => new Types.ObjectId(id))
      }
      if (entry.booleanAnswer !== undefined) current.booleanAnswer = entry.booleanAnswer
      if (entry.textAnswer !== undefined) current.textAnswer = entry.textAnswer
      if (entry.numericAnswer !== undefined) current.numericAnswer = entry.numericAnswer
      if (entry.flaggedForReview !== undefined) current.flaggedForReview = entry.flaggedForReview
      current.answeredAt = now
      byQuestionId.set(entry.questionId, current)
    }

    const updated = await assessmentAttemptRepository.updateById(attemptId, {
      answers: [...byQuestionId.values()],
      updatedBy: student.userId,
    })
    if (!updated) throw ApiError.notFound('Attempt not found')

    return { savedAt: now.toISOString() }
  },

  /** Idempotent — resubmitting an already-finalized attempt simply returns its current state, never re-scores or errors (task's own explicit "submitting must be idempotent" rule). */
  async submitAttempt(userId: string, attemptId: string): Promise<StudentAttemptDto> {
    const { attempt, assessment } = await requireOwnAttempt(userId, attemptId)
    if (attempt.status !== 'IN_PROGRESS') {
      return toStudentAttemptDto(attempt, assessment)
    }
    const finalized = await finalizeAttemptSubmission(attempt, assessment, 'MANUAL')
    return toStudentAttemptDto(finalized, assessment)
  },

  /** Audit-only signal (task's own explicit "do not label it cheating" instruction) — a tab/window blur count, never surfaced to the student as a warning or penalty. */
  async recordFocusLoss(userId: string, attemptId: string): Promise<{ focusLossCount: number }> {
    const { attempt } = await requireOwnAttempt(userId, attemptId)
    if (attempt.status !== 'IN_PROGRESS') return { focusLossCount: attempt.focusLossCount }

    const updated = await assessmentAttemptRepository.updateById(attemptId, {
      $inc: { focusLossCount: 1 },
    })
    return { focusLossCount: updated?.focusLossCount ?? attempt.focusLossCount }
  },
}
