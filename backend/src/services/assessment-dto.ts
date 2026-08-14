import type {
  AssessmentDocument,
  AssessmentStatus,
  AssessmentType,
} from '../models/assessment.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { QuestionDocument } from '../models/question.model'
import type { AssessmentAttemptCounts } from '../repositories/assessment-attempt.repository'
import { isAssessmentAcceptingAttempts } from '../utils/assessment-lifecycle.util'

export interface AssessmentBatchSummary {
  id: string
  batchCode: string
  name: string
}

export interface AssessmentSectionQuestionSummaryDto {
  id: string
  questionCode: string
  questionText: string
  questionType: string
  marks: number
}

export interface AdminAssessmentSectionDto {
  id: string
  title: string
  instructions: string | null
  order: number
  randomQuestionCount: number | null
  questions: AssessmentSectionQuestionSummaryDto[]
}

/** The one assessment read shape shared by the admin and trainer surfaces — a trainer, like an admin, is an "operator" who needs full configuration + grading-progress counters, mirroring `AdminAssignmentDto`'s own precedent. */
export interface AdminAssessmentDto {
  id: string
  assessmentCode: string
  assessmentType: AssessmentType
  courseId: string
  courseCode: string
  courseTitle: string
  batches: AssessmentBatchSummary[]
  title: string
  description: string | null
  instructions: string | null
  status: AssessmentStatus
  /** The always-recomputed "can a student start/resume an attempt right now" gate — see `assessment-lifecycle.util.ts#isAssessmentAcceptingAttempts`. Never itself a stored/authoritative value. */
  isAcceptingAttempts: boolean
  timezone: string
  openAt: string | null
  closeAt: string | null
  durationMinutes: number
  maxAttempts: number
  passingPercentage: number | null
  totalMarks: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResultImmediately: boolean
  showCorrectAnswersAfterResult: boolean
  allowReviewAfterSubmit: boolean
  negativeMarkingEnabled: boolean
  sections: AdminAssessmentSectionDto[]
  questionCount: number
  publishedAt: string | null
  closedAt: string | null
  resultsPublishedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  attemptCounts: AssessmentAttemptCounts
  createdAt: string
  updatedAt: string
}

const EMPTY_COUNTS: AssessmentAttemptCounts = {
  totalAttempts: 0,
  pendingGrading: 0,
  graded: 0,
  passed: 0,
  failed: 0,
}

export function toAdminAssessmentDto(
  assessment: AssessmentDocument,
  course: Pick<CourseDocument, '_id' | 'courseCode' | 'title'>,
  batchById: Map<string, Pick<BatchDocument, '_id' | 'batchCode' | 'name'>>,
  questionById: Map<
    string,
    Pick<QuestionDocument, '_id' | 'questionCode' | 'questionText' | 'questionType' | 'marks'>
  >,
  counts: AssessmentAttemptCounts | undefined,
): AdminAssessmentDto {
  const sections = [...assessment.sections].sort((a, b) => a.order - b.order)
  const questionCount = sections.reduce(
    (sum, section) => sum + (section.randomQuestionCount ?? section.questionIds.length),
    0,
  )

  return {
    id: assessment._id.toString(),
    assessmentCode: assessment.assessmentCode,
    assessmentType: assessment.assessmentType,
    courseId: course._id.toString(),
    courseCode: course.courseCode,
    courseTitle: course.title,
    batches: assessment.batchIds
      .map((id) => batchById.get(id.toString()))
      .filter((batch): batch is NonNullable<typeof batch> => batch !== undefined)
      .map((batch) => ({ id: batch._id.toString(), batchCode: batch.batchCode, name: batch.name })),
    title: assessment.title,
    description: assessment.description,
    instructions: assessment.instructions,
    status: assessment.status,
    isAcceptingAttempts: isAssessmentAcceptingAttempts(assessment, new Date()),
    timezone: assessment.timezone,
    openAt: assessment.openAt ? assessment.openAt.toISOString() : null,
    closeAt: assessment.closeAt ? assessment.closeAt.toISOString() : null,
    durationMinutes: assessment.durationMinutes,
    maxAttempts: assessment.maxAttempts,
    passingPercentage: assessment.passingPercentage,
    totalMarks: assessment.totalMarks,
    shuffleQuestions: assessment.shuffleQuestions,
    shuffleOptions: assessment.shuffleOptions,
    showResultImmediately: assessment.showResultImmediately,
    showCorrectAnswersAfterResult: assessment.showCorrectAnswersAfterResult,
    allowReviewAfterSubmit: assessment.allowReviewAfterSubmit,
    negativeMarkingEnabled: assessment.negativeMarkingEnabled,
    sections: sections.map((section) => ({
      id: section._id.toString(),
      title: section.title,
      instructions: section.instructions,
      order: section.order,
      randomQuestionCount: section.randomQuestionCount,
      questions: section.questionIds
        .map((id) => questionById.get(id.toString()))
        .filter((question): question is NonNullable<typeof question> => question !== undefined)
        .map((question) => ({
          id: question._id.toString(),
          questionCode: question.questionCode,
          questionText: question.questionText,
          questionType: question.questionType,
          marks: question.marks,
        })),
    })),
    questionCount,
    publishedAt: assessment.publishedAt ? assessment.publishedAt.toISOString() : null,
    closedAt: assessment.closedAt ? assessment.closedAt.toISOString() : null,
    resultsPublishedAt: assessment.resultsPublishedAt
      ? assessment.resultsPublishedAt.toISOString()
      : null,
    cancelledAt: assessment.cancelledAt ? assessment.cancelledAt.toISOString() : null,
    cancellationReason: assessment.cancellationReason,
    attemptCounts: counts ?? EMPTY_COUNTS,
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  }
}
