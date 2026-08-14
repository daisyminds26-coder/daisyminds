import { ApiError } from '../utils/api-error'
import { resolveTrainerForUser } from './trainer-identity.util'
import { assessmentGradingService } from './assessment-grading.service'
import { materializeAttemptExpiry } from './assessment-attempt-finalize.service'
import { toAdminAssessmentDto, type AdminAssessmentDto } from './assessment-dto'
import {
  toGraderAttemptDto,
  type AttemptSummaryDto,
  type GraderAttemptDto,
} from './assessment-attempt-dto'
import { assessmentRepository } from '../repositories/assessment.repository'
import { assessmentAttemptRepository } from '../repositories/assessment-attempt.repository'
import { questionRepository } from '../repositories/question.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { studentRepository } from '../repositories/student.repository'
import type { AssessmentDocument } from '../models/assessment.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  GradeAttemptInput,
  ListAttemptsQuery,
} from '../validators/assessment-attempt.validator'

/** A trainer may only ever act on an assessment that targets at least one batch they teach — never arbitrary assessment access. Not found, not forbidden, for anything else: no existence disclosure. Mirrors `trainer-assignment.service.ts#requireOwnedAssignment` exactly. */
async function requireOwnedAssessment(
  trainerId: string,
  assessmentId: string,
): Promise<AssessmentDocument> {
  const assessment = await assessmentRepository.findById(assessmentId)
  if (!assessment) throw ApiError.notFound('Assessment not found')

  const myBatches = await batchRepository.findIdsForTrainer(trainerId)
  const myBatchIds = new Set(myBatches.map((batch) => batch._id.toString()))
  const owned = assessment.batchIds.some((batchId) => myBatchIds.has(batchId.toString()))
  if (!owned) throw ApiError.notFound('Assessment not found')

  return assessment
}

async function buildDto(assessment: AssessmentDocument): Promise<AdminAssessmentDto> {
  const [course, batches, countsMap] = await Promise.all([
    courseRepository.findById(assessment.courseId.toString()),
    batchRepository.findByIds(assessment.batchIds.map((id) => id.toString())),
    assessmentAttemptRepository.countsByAssessmentIds([assessment._id.toString()]),
  ])
  if (!course) throw ApiError.notFound('Assessment not found')
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

  const questionIds = [
    ...new Set(
      assessment.sections.flatMap((section) => section.questionIds.map((id) => id.toString())),
    ),
  ]
  const questions = await questionRepository.findByIds(questionIds)
  const questionById = new Map(questions.map((question) => [question._id.toString(), question]))

  return toAdminAssessmentDto(
    assessment,
    course,
    batchById,
    questionById,
    countsMap.get(assessment._id.toString()),
  )
}

export const trainerAssessmentService = {
  async listMyAssessments(userId: string): Promise<AdminAssessmentDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    const myBatches = await batchRepository.findIdsForTrainer(trainer._id.toString())
    const myBatchIds = myBatches.map((batch) => batch._id.toString())

    const assessments = await assessmentRepository.findForBatchesAnyStatus(myBatchIds, {})
    return Promise.all(assessments.map((assessment) => buildDto(assessment)))
  },

  async getMyAssessment(userId: string, assessmentId: string): Promise<AdminAssessmentDto> {
    const trainer = await resolveTrainerForUser(userId)
    const assessment = await requireOwnedAssessment(trainer._id.toString(), assessmentId)
    return buildDto(assessment)
  },

  async listMyAttempts(
    userId: string,
    assessmentId: string,
    filter: ListAttemptsQuery,
  ): Promise<AttemptSummaryDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssessment(trainer._id.toString(), assessmentId)
    return assessmentGradingService.listAttempts(assessmentId, filter)
  },

  /** Flat `/trainer/assessment-attempts/:attemptId` shape (task's own suggested endpoint) — ownership is resolved from the attempt's own `assessmentId`, not a URL segment, then delegates to the shared grading DTO mapper. Lazily materializes expiry first, so a trainer opening a grading view for a long-abandoned attempt still sees it correctly transitioned out of `IN_PROGRESS`. */
  async getMyAttempt(userId: string, attemptId: string): Promise<GraderAttemptDto> {
    const trainer = await resolveTrainerForUser(userId)
    const attempt = await assessmentGradingService.getAttemptById(attemptId)
    const assessment = await requireOwnedAssessment(
      trainer._id.toString(),
      attempt.assessmentId.toString(),
    )

    const materialized = await materializeAttemptExpiry(attempt, assessment)
    const student = await studentRepository.findById(materialized.studentId.toString())
    if (!student) throw ApiError.notFound('Attempt not found')
    return toGraderAttemptDto(materialized, assessment, student)
  },

  async gradeMyAttempt(
    userId: string,
    attemptId: string,
    input: GradeAttemptInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<GraderAttemptDto> {
    const trainer = await resolveTrainerForUser(userId)
    const attempt = await assessmentGradingService.getAttemptById(attemptId)
    await requireOwnedAssessment(trainer._id.toString(), attempt.assessmentId.toString())
    return assessmentGradingService.gradeAttempt(
      attempt.assessmentId.toString(),
      attemptId,
      input,
      actor,
      context,
    )
  },
}
