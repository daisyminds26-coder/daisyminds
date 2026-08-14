import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { canTransitionAssessment, isAssessmentEditable } from '../utils/assessment-lifecycle.util'
import { generateAssessmentCode } from './assessment-id.service'
import { toAdminAssessmentDto, type AdminAssessmentDto } from './assessment-dto'
import {
  assessmentRepository,
  type ListAssessmentsFilter,
} from '../repositories/assessment.repository'
import { assessmentAttemptRepository } from '../repositories/assessment-attempt.repository'
import { questionRepository } from '../repositories/question.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type {
  AssessmentDocument,
  AssessmentStatus,
  IAssessmentSection,
} from '../models/assessment.model'
import type { QuestionDocument } from '../models/question.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  CancelAssessmentInput,
  CreateAssessmentInput,
  ListAssessmentsQuery,
  ReplaceSectionsInput,
  UpdateAssessmentInput,
} from '../validators/assessment.validator'

const AUDIT_ENTITY_TYPE = 'assessment'

export interface ReadinessBlocker {
  field: string
  message: string
}

async function recordAudit(
  assessmentId: string,
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
    entityId: assessmentId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function requireCourse(courseId: string): Promise<CourseDocument> {
  const course = await courseRepository.findById(courseId)
  if (!course) throw ApiError.notFound('Course not found')
  return course
}

/** Every target batch must exist and belong to the same course — never a batch from another course, mirrors `assignment.service.ts#requireTargetBatches` exactly. */
async function requireTargetBatches(
  courseId: string,
  batchIds: string[],
): Promise<BatchDocument[]> {
  if (batchIds.length === 0) throw ApiError.badRequest('At least one target batch is required')
  const batches = await batchRepository.findByIds(batchIds)
  if (batches.length !== batchIds.length) {
    throw ApiError.badRequest('One or more target batches do not exist')
  }
  const mismatched = batches.filter((batch) => batch.courseId.toString() !== courseId)
  if (mismatched.length > 0) {
    throw ApiError.badRequest("Every target batch must belong to the assessment's own course")
  }
  return batches
}

async function questionMapForAssessments(
  assessments: AssessmentDocument[],
): Promise<Map<string, QuestionDocument>> {
  const questionIds = [
    ...new Set(
      assessments.flatMap((assessment) =>
        assessment.sections.flatMap((section) => section.questionIds.map((id) => id.toString())),
      ),
    ),
  ]
  const questions = await questionRepository.findByIds(questionIds)
  return new Map(questions.map((question) => [question._id.toString(), question]))
}

async function buildDtos(assessments: AssessmentDocument[]): Promise<AdminAssessmentDto[]> {
  const courseIds = [...new Set(assessments.map((assessment) => assessment.courseId.toString()))]
  const batchIds = [
    ...new Set(assessments.flatMap((assessment) => assessment.batchIds.map((id) => id.toString()))),
  ]
  const assessmentIds = assessments.map((assessment) => assessment._id.toString())

  const [courses, batches, questionById, countsMap] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
    questionMapForAssessments(assessments),
    assessmentAttemptRepository.countsByAssessmentIds(assessmentIds),
  ])

  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

  const dtos: AdminAssessmentDto[] = []
  for (const assessment of assessments) {
    const course = courseById.get(assessment.courseId.toString())
    if (!course) continue
    dtos.push(
      toAdminAssessmentDto(
        assessment,
        course,
        batchById,
        questionById,
        countsMap.get(assessment._id.toString()),
      ),
    )
  }
  return dtos
}

function toFilter(query: ListAssessmentsQuery): ListAssessmentsFilter {
  return {
    courseId: query.courseId,
    batchId: query.batchId,
    assessmentType: query.assessmentType,
    status: query.status,
    search: query.search,
  }
}

/** Sum of each section's marks contribution — a `randomQuestionCount` pool contributes `count * (uniform per-question marks)`, enforced equal across the pool at `replaceSections` write time (see that function's own doc comment for why). */
function computeTotalMarks(
  sections: readonly IAssessmentSection[],
  questionById: Map<string, Pick<QuestionDocument, 'marks'>>,
): number {
  let total = 0
  for (const section of sections) {
    const marksInPool = section.questionIds
      .map((id) => questionById.get(id.toString())?.marks)
      .filter((marks): marks is number => marks !== undefined)
    if (section.randomQuestionCount) {
      total += section.randomQuestionCount * (marksInPool[0] ?? 0)
    } else {
      total += marksInPool.reduce((sum, marks) => sum + marks, 0)
    }
  }
  return total
}

/**
 * Structured blockers, never a bare `400` — mirrors `assignment.service.ts#
 * assertReadyToPublish`/`batch-readiness.service.ts`'s own shape. Re-verifies
 * the equal-marks-within-a-random-pool rule as defense-in-depth (already
 * enforced at `replaceSections` write time — same "readiness re-checks an
 * invariant that's already enforced elsewhere" precedent curriculum's own
 * cycle-detection established, SECURITY.md §4).
 */
async function computeReadinessBlockers(
  assessment: AssessmentDocument,
): Promise<ReadinessBlocker[]> {
  const blockers: ReadinessBlocker[] = []

  if (assessment.title.trim().length === 0) {
    blockers.push({ field: 'title', message: 'Title is required' })
  }
  if (assessment.batchIds.length === 0) {
    blockers.push({ field: 'batchIds', message: 'At least one target batch is required' })
  }
  if (assessment.durationMinutes <= 0) {
    blockers.push({ field: 'durationMinutes', message: 'Duration must be greater than 0' })
  }
  if (assessment.openAt && assessment.closeAt && assessment.closeAt <= assessment.openAt) {
    blockers.push({ field: 'closeAt', message: 'closeAt must be after openAt' })
  }

  const questionCount = assessment.sections.reduce(
    (sum, section) => sum + (section.randomQuestionCount ?? section.questionIds.length),
    0,
  )
  if (questionCount === 0) {
    blockers.push({ field: 'sections', message: 'At least one question is required' })
  }
  if (assessment.totalMarks <= 0) {
    blockers.push({ field: 'totalMarks', message: 'Total marks must be greater than 0' })
  }
  if (
    assessment.passingPercentage !== null &&
    (assessment.passingPercentage < 0 || assessment.passingPercentage > 100)
  ) {
    blockers.push({
      field: 'passingPercentage',
      message: 'Passing percentage must be between 0 and 100',
    })
  }

  const allQuestionIds = [
    ...new Set(
      assessment.sections.flatMap((section) => section.questionIds.map((id) => id.toString())),
    ),
  ]
  const activeQuestions = await questionRepository.findActiveByIds(allQuestionIds)
  const activeQuestionById = new Map(
    activeQuestions.map((question) => [question._id.toString(), question]),
  )
  if (activeQuestions.length !== allQuestionIds.length) {
    blockers.push({
      field: 'sections',
      message: 'One or more referenced questions are missing or not ACTIVE',
    })
  }
  for (const section of assessment.sections) {
    if (!section.randomQuestionCount) continue
    if (section.randomQuestionCount > section.questionIds.length) {
      blockers.push({
        field: 'sections',
        message: `Section "${section.title || 'Untitled'}" — randomQuestionCount exceeds its question pool`,
      })
      continue
    }
    const marksInPool = new Set(
      section.questionIds
        .map((id) => activeQuestionById.get(id.toString())?.marks)
        .filter((marks): marks is number => marks !== undefined),
    )
    if (marksInPool.size > 1) {
      blockers.push({
        field: 'sections',
        message: `Section "${section.title || 'Untitled'}" — every question in a randomized pool must carry equal marks`,
      })
    }
  }

  return blockers
}

export const assessmentService = {
  async listAssessments(query: ListAssessmentsQuery): Promise<{
    data: AdminAssessmentDto[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const { rows, total } = await assessmentRepository.list(toFilter(query), {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    })
    const data = await buildDtos(rows)
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },

  async getAssessment(id: string): Promise<AdminAssessmentDto> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    const [dto] = await buildDtos([assessment])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },

  async createAssessment(
    input: CreateAssessmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssessmentDto> {
    await requireCourse(input.courseId)
    await requireTargetBatches(input.courseId, input.batchIds)

    const assessmentCode = await generateAssessmentCode()
    const assessment = await assessmentRepository.create({
      assessmentCode,
      assessmentType: input.assessmentType,
      courseId: new Types.ObjectId(input.courseId),
      batchIds: input.batchIds.map((id) => new Types.ObjectId(id)),
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      status: 'DRAFT',
      timezone: input.timezone,
      openAt: input.openAt ?? null,
      closeAt: input.closeAt ?? null,
      durationMinutes: input.durationMinutes,
      maxAttempts: input.maxAttempts,
      passingPercentage: input.passingPercentage ?? null,
      totalMarks: 0,
      shuffleQuestions: input.shuffleQuestions,
      shuffleOptions: input.shuffleOptions,
      showResultImmediately: input.showResultImmediately,
      showCorrectAnswersAfterResult: input.showCorrectAnswersAfterResult,
      allowReviewAfterSubmit: input.allowReviewAfterSubmit,
      negativeMarkingEnabled: input.negativeMarkingEnabled,
      sections: [],
      createdBy: new Types.ObjectId(actor.id),
    })

    await recordAudit(assessment._id.toString(), 'assessment.created', actor, context, {
      assessmentCode,
    })

    const [dto] = await buildDtos([assessment])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },

  async updateAssessment(
    id: string,
    input: UpdateAssessmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssessmentDto> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    if (!isAssessmentEditable(assessment.status)) {
      throw ApiError.conflict('Only a DRAFT assessment can be edited')
    }

    if (input.batchIds) {
      await requireTargetBatches(assessment.courseId.toString(), input.batchIds)
    }

    const update: Record<string, unknown> = { updatedBy: actor.id }
    if (input.assessmentType !== undefined) update.assessmentType = input.assessmentType
    if (input.batchIds !== undefined)
      update.batchIds = input.batchIds.map((bid) => new Types.ObjectId(bid))
    if (input.title !== undefined) update.title = input.title
    if (input.description !== undefined) update.description = input.description
    if (input.instructions !== undefined) update.instructions = input.instructions
    if (input.timezone !== undefined) update.timezone = input.timezone
    if (input.openAt !== undefined) update.openAt = input.openAt
    if (input.closeAt !== undefined) update.closeAt = input.closeAt
    if (input.durationMinutes !== undefined) update.durationMinutes = input.durationMinutes
    if (input.maxAttempts !== undefined) update.maxAttempts = input.maxAttempts
    if (input.passingPercentage !== undefined) update.passingPercentage = input.passingPercentage
    if (input.shuffleQuestions !== undefined) update.shuffleQuestions = input.shuffleQuestions
    if (input.shuffleOptions !== undefined) update.shuffleOptions = input.shuffleOptions
    if (input.showResultImmediately !== undefined)
      update.showResultImmediately = input.showResultImmediately
    if (input.showCorrectAnswersAfterResult !== undefined)
      update.showCorrectAnswersAfterResult = input.showCorrectAnswersAfterResult
    if (input.allowReviewAfterSubmit !== undefined)
      update.allowReviewAfterSubmit = input.allowReviewAfterSubmit
    if (input.negativeMarkingEnabled !== undefined)
      update.negativeMarkingEnabled = input.negativeMarkingEnabled

    const updated = await assessmentRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Assessment not found')

    await recordAudit(id, 'assessment.updated', actor, context, { fields: Object.keys(update) })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },

  /**
   * Whole-array replace for `sections` (and, transitively, every question
   * assignment within them) — same "compact, whole-set, never partial"
   * contract API-STANDARDS.md §4 established for batches' weekly-schedule/
   * calendar-exceptions. Every referenced question must belong to the
   * assessment's own course (never cross-course), and every random-pool
   * section's questions must carry equal marks (documented in
   * `assessment-section.schema.ts`) — both checked eagerly here, not only
   * at publish time, so an authoring mistake surfaces immediately.
   */
  async replaceSections(
    id: string,
    input: ReplaceSectionsInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssessmentDto> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    if (!isAssessmentEditable(assessment.status)) {
      throw ApiError.conflict('Only a DRAFT assessment can be edited')
    }

    const allQuestionIds = [...new Set(input.sections.flatMap((section) => section.questionIds))]
    const questions = await questionRepository.findByIds(allQuestionIds)
    if (questions.length !== allQuestionIds.length) {
      throw ApiError.badRequest('One or more referenced questions do not exist')
    }
    const questionById = new Map(questions.map((question) => [question._id.toString(), question]))
    const foreignCourse = questions.find(
      (question) => question.courseId.toString() !== assessment.courseId.toString(),
    )
    if (foreignCourse) {
      throw ApiError.badRequest("Every question must belong to the assessment's own course")
    }

    for (const section of input.sections) {
      if (!section.randomQuestionCount) continue
      const marksInPool = new Set(section.questionIds.map((qid) => questionById.get(qid)?.marks))
      if (marksInPool.size > 1) {
        throw ApiError.badRequest(
          `Section "${section.title || 'Untitled'}" — every question in a randomized pool must carry equal marks`,
        )
      }
    }

    const sections: IAssessmentSection[] = input.sections.map((section) => ({
      _id: new Types.ObjectId(),
      title: section.title,
      instructions: section.instructions ?? null,
      order: section.order,
      questionIds: section.questionIds.map((qid) => new Types.ObjectId(qid)),
      randomQuestionCount: section.randomQuestionCount ?? null,
    }))
    const totalMarks = computeTotalMarks(sections, questionById)

    const updated = await assessmentRepository.updateById(id, {
      sections,
      totalMarks,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Assessment not found')

    await recordAudit(id, 'assessment.sections_changed', actor, context, {
      sectionCount: sections.length,
      totalMarks,
    })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },

  async checkReadiness(id: string): Promise<{ ready: boolean; blockers: ReadinessBlocker[] }> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    const blockers = await computeReadinessBlockers(assessment)
    return { ready: blockers.length === 0, blockers }
  },

  async transition(
    id: string,
    to: AssessmentStatus,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssessmentDto> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    if (!canTransitionAssessment(assessment.status, to)) {
      throw ApiError.conflict(`Cannot move an assessment from ${assessment.status} to ${to}`)
    }

    if (to === 'PUBLISHED') {
      const blockers = await computeReadinessBlockers(assessment)
      if (blockers.length > 0) {
        throw ApiError.unprocessable(
          'This assessment is not ready to publish',
          blockers.map((blocker) => ({ field: blocker.field, message: blocker.message })),
        )
      }
    }
    if (to === 'RESULT_PUBLISHED') {
      const pending = await assessmentAttemptRepository.countPendingManualGrading(id)
      if (pending > 0) {
        throw ApiError.unprocessable('This assessment is not ready to publish', [
          {
            field: 'attempts',
            message: `${String(pending)} attempt(s) still pending manual grading`,
          },
        ])
      }
    }

    const update: Record<string, unknown> = { status: to, updatedBy: actor.id }
    const now = new Date()
    if (to === 'PUBLISHED') update.publishedAt = now
    if (to === 'CLOSED') update.closedAt = now
    if (to === 'RESULT_PUBLISHED') update.resultsPublishedAt = now

    const updated = await assessmentRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Assessment not found')

    if (to === 'RESULT_PUBLISHED') {
      await assessmentAttemptRepository.markResultsVisible(id, now)
    }

    const actionByStatus: Partial<Record<AssessmentStatus, string>> = {
      PUBLISHED: 'assessment.published',
      CLOSED: 'assessment.closed',
      RESULT_PUBLISHED: 'assessment.results_published',
      ARCHIVED: 'assessment.archived',
    }
    await recordAudit(id, actionByStatus[to] ?? 'assessment.updated', actor, context, {
      from: assessment.status,
      to,
    })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },

  async cancelAssessment(
    id: string,
    input: CancelAssessmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssessmentDto> {
    const assessment = await assessmentRepository.findById(id)
    if (!assessment) throw ApiError.notFound('Assessment not found')
    if (!canTransitionAssessment(assessment.status, 'CANCELLED')) {
      throw ApiError.conflict(`Cannot cancel an assessment in ${assessment.status} status`)
    }

    const updated = await assessmentRepository.updateById(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: input.reason,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Assessment not found')

    await recordAudit(id, 'assessment.cancelled', actor, context, { reason: input.reason })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assessment not found')
    return dto
  },
}
