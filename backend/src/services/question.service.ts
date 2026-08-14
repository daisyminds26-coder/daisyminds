import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { generateQuestionCode } from './question-id.service'
import { toAdminQuestionDto, type AdminQuestionDto } from './question-dto'
import { questionRepository, type ListQuestionsFilter } from '../repositories/question.repository'
import { courseRepository } from '../repositories/course.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { QuestionDocument, IQuestionOption } from '../models/question.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  CreateQuestionInput,
  ListQuestionsQuery,
  UpdateQuestionInput,
} from '../validators/question.validator'

const AUDIT_ENTITY_TYPE = 'question'

async function recordAudit(
  questionId: string,
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
    entityId: questionId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function buildDtos(questions: QuestionDocument[]): Promise<AdminQuestionDto[]> {
  const courseIds = [...new Set(questions.map((question) => question.courseId.toString()))]
  const courses = await courseRepository.findByIds(courseIds)
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))

  const dtos: AdminQuestionDto[] = []
  for (const question of questions) {
    const course = courseById.get(question.courseId.toString())
    if (!course) continue
    dtos.push(toAdminQuestionDto(question, course))
  }
  return dtos
}

function toFilter(query: ListQuestionsQuery): ListQuestionsFilter {
  return {
    courseId: query.courseId,
    questionType: query.questionType,
    difficulty: query.difficulty,
    status: query.status,
    tag: query.tag,
    search: query.search,
  }
}

export const questionService = {
  async listQuestions(query: ListQuestionsQuery): Promise<{
    data: AdminQuestionDto[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const { rows, total } = await questionRepository.list(toFilter(query), {
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

  async getQuestion(id: string): Promise<AdminQuestionDto> {
    const question = await questionRepository.findById(id)
    if (!question) throw ApiError.notFound('Question not found')
    const [dto] = await buildDtos([question])
    if (!dto) throw ApiError.notFound('Question not found')
    return dto
  },

  async createQuestion(
    input: CreateQuestionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminQuestionDto> {
    const course = await courseRepository.findById(input.courseId)
    if (!course) throw ApiError.notFound('Course not found')

    const questionCode = await generateQuestionCode()
    const question = await questionRepository.create({
      questionCode,
      courseId: new Types.ObjectId(input.courseId),
      moduleId: input.moduleId ? new Types.ObjectId(input.moduleId) : null,
      lessonId: input.lessonId ? new Types.ObjectId(input.lessonId) : null,
      questionType: input.questionType,
      difficulty: input.difficulty ?? null,
      questionText: input.questionText,
      explanation: input.explanation ?? null,
      marks: input.marks,
      negativeMarks: input.negativeMarks ?? null,
      // `_id` is Mongoose-generated on insert — the create-input shape never carries one.
      options: input.options as IQuestionOption[],
      correctBoolean: input.correctBoolean ?? null,
      acceptedAnswers: input.acceptedAnswers,
      correctNumericAnswer: input.correctNumericAnswer ?? null,
      tags: input.tags,
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
    })

    await recordAudit(question._id.toString(), 'question.created', actor, context, { questionCode })

    const [dto] = await buildDtos([question])
    if (!dto) throw ApiError.notFound('Question not found')
    return dto
  },

  async updateQuestion(
    id: string,
    input: UpdateQuestionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminQuestionDto> {
    const question = await questionRepository.findById(id)
    if (!question) throw ApiError.notFound('Question not found')
    if (question.status === 'ARCHIVED') {
      throw ApiError.conflict('An archived question cannot be edited')
    }

    const update: Record<string, unknown> = { updatedBy: actor.id }
    if (input.courseId !== undefined) update.courseId = new Types.ObjectId(input.courseId)
    if (input.moduleId !== undefined)
      update.moduleId = input.moduleId ? new Types.ObjectId(input.moduleId) : null
    if (input.lessonId !== undefined)
      update.lessonId = input.lessonId ? new Types.ObjectId(input.lessonId) : null
    if (input.questionType !== undefined) update.questionType = input.questionType
    if (input.difficulty !== undefined) update.difficulty = input.difficulty
    if (input.questionText !== undefined) update.questionText = input.questionText
    if (input.explanation !== undefined) update.explanation = input.explanation
    if (input.marks !== undefined) update.marks = input.marks
    if (input.negativeMarks !== undefined) update.negativeMarks = input.negativeMarks
    if (input.options !== undefined) update.options = input.options
    if (input.correctBoolean !== undefined) update.correctBoolean = input.correctBoolean
    if (input.acceptedAnswers !== undefined) update.acceptedAnswers = input.acceptedAnswers
    if (input.correctNumericAnswer !== undefined)
      update.correctNumericAnswer = input.correctNumericAnswer
    if (input.tags !== undefined) update.tags = input.tags

    const updated = await questionRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Question not found')

    await recordAudit(id, 'question.updated', actor, context, { fields: Object.keys(update) })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Question not found')
    return dto
  },

  async archiveQuestion(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminQuestionDto> {
    const question = await questionRepository.findById(id)
    if (!question) throw ApiError.notFound('Question not found')
    if (question.status === 'ARCHIVED') throw ApiError.conflict('This question is already archived')

    const updated = await questionRepository.updateById(id, {
      status: 'ARCHIVED',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Question not found')

    await recordAudit(id, 'question.archived', actor, context)

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Question not found')
    return dto
  },

  /** A fresh `DRAFT` copy, same content, new `questionCode` — never shares identity with the source (an edit to the copy must never affect the original, or any attempt snapshot that already references the original). */
  async duplicateQuestion(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminQuestionDto> {
    const source = await questionRepository.findById(id)
    if (!source) throw ApiError.notFound('Question not found')

    const questionCode = await generateQuestionCode()
    const copy = await questionRepository.create({
      questionCode,
      courseId: source.courseId,
      moduleId: source.moduleId,
      lessonId: source.lessonId,
      questionType: source.questionType,
      difficulty: source.difficulty,
      questionText: `${source.questionText} (Copy)`,
      explanation: source.explanation,
      marks: source.marks,
      negativeMarks: source.negativeMarks,
      options: source.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect,
      })) as IQuestionOption[],
      correctBoolean: source.correctBoolean,
      acceptedAnswers: [...source.acceptedAnswers],
      correctNumericAnswer: source.correctNumericAnswer,
      tags: [...source.tags],
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
    })

    await recordAudit(copy._id.toString(), 'question.created', actor, context, {
      questionCode,
      duplicatedFrom: id,
    })

    const [dto] = await buildDtos([copy])
    if (!dto) throw ApiError.notFound('Question not found')
    return dto
  },
}
