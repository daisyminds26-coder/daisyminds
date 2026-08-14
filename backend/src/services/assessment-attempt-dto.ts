import type { AssessmentAttemptDocument, PassStatus } from '../models/assessment-attempt.model'
import type { AssessmentDocument } from '../models/assessment.model'
import type { StudentDocument } from '../models/student.model'
import type { QuestionType } from '../models/question.model'
import {
  isAttemptResultVisible,
  isCorrectAnswerReviewVisible,
} from '../utils/assessment-scoring.util'

export interface AttemptQuestionOptionDto {
  id: string
  text: string
  /** Present only when the caller is authorized to see correctness (grader view, or a student's own result once correct-answer review is visible). */
  isCorrect?: boolean
}

/**
 * One question as it appears inside an attempt — shared shape for both the
 * exam player (mid-attempt, no correctness fields at all) and a graded
 * result review (correctness fields present only when the caller has been
 * authorized to see them). Never a single "kitchen sink" object returned
 * unconditionally with correctness fields the caller strips client-side —
 * the server decides what's present, per SECURITY.md's "never leak the
 * answer key" rule.
 */
export interface AttemptQuestionDto {
  questionId: string
  sectionId: string
  order: number
  questionType: QuestionType
  questionText: string
  marks: number
  negativeMarks: number | null
  options: AttemptQuestionOptionDto[]
  correctBoolean?: boolean | null
  acceptedAnswers?: string[]
  correctNumericAnswer?: number | null
  explanation?: string | null
  requiresManualGrading: boolean

  selectedOptionIds: string[]
  booleanAnswer: boolean | null
  textAnswer: string | null
  numericAnswer: number | null
  flaggedForReview: boolean
  answeredAt: string | null

  marksAwarded?: number | null
  isCorrect?: boolean | null
  manualFeedback?: string | null
}

export interface MapAttemptQuestionsOptions {
  /** Grader view (admin/trainer) or a student's own result once correct-answer review is visible — includes `options[].isCorrect`, `correctBoolean`, `acceptedAnswers`, `correctNumericAnswer`, `explanation`. */
  revealCorrectness: boolean
  /** Includes `marksAwarded`/`isCorrect`/`manualFeedback` — true for a grader always, true for a student only once the attempt is fully `GRADED`. */
  includeGrading: boolean
}

export function mapAttemptQuestions(
  attempt: Pick<AssessmentAttemptDocument, 'questionSnapshot' | 'answers'>,
  options: MapAttemptQuestionsOptions,
): AttemptQuestionDto[] {
  const answerByQuestionId = new Map(
    attempt.answers.map((answer) => [answer.questionId.toString(), answer]),
  )

  return [...attempt.questionSnapshot]
    .sort((a, b) => a.order - b.order)
    .map((question) => {
      const answer = answerByQuestionId.get(question.questionId.toString())
      const dto: AttemptQuestionDto = {
        questionId: question.questionId.toString(),
        sectionId: question.sectionId.toString(),
        order: question.order,
        questionType: question.questionType,
        questionText: question.questionText,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        options: question.options.map((option) => ({
          id: option._id.toString(),
          text: option.text,
          ...(options.revealCorrectness ? { isCorrect: option.isCorrect } : {}),
        })),
        requiresManualGrading: question.requiresManualGrading,
        selectedOptionIds: (answer?.selectedOptionIds ?? []).map((id) => id.toString()),
        booleanAnswer: answer?.booleanAnswer ?? null,
        textAnswer: answer?.textAnswer ?? null,
        numericAnswer: answer?.numericAnswer ?? null,
        flaggedForReview: answer?.flaggedForReview ?? false,
        answeredAt: answer?.answeredAt ? answer.answeredAt.toISOString() : null,
      }
      if (options.revealCorrectness) {
        dto.correctBoolean = question.correctBoolean
        dto.acceptedAnswers = question.acceptedAnswers
        dto.correctNumericAnswer = question.correctNumericAnswer
        dto.explanation = question.explanation
      }
      if (options.includeGrading) {
        dto.marksAwarded = answer?.marksAwarded ?? null
        dto.isCorrect = answer?.isCorrect ?? null
        dto.manualFeedback = answer?.manualFeedback ?? null
      }
      return dto
    })
}

export interface StudentAttemptDto {
  id: string
  attemptCode: string
  assessmentId: string
  assessmentTitle: string
  attemptNumber: number
  status: AssessmentAttemptDocument['status']
  startedAt: string
  expiresAt: string
  submittedAt: string | null
  durationMinutes: number
  totalMarks: number
  passingPercentage: number | null
  sections: { id: string; title: string; instructions: string | null; order: number }[]
  questions: AttemptQuestionDto[]
  resultVisible: boolean
  objectiveMarks: number | null
  manualMarks: number | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  allowReview: boolean
}

/** The player's own attempt shape — never includes correctness fields while `IN_PROGRESS`; once `GRADED`, includes score fields only if `isAttemptResultVisible`, and correct-answer detail only if `isCorrectAnswerReviewVisible` on top of that. */
export function toStudentAttemptDto(
  attempt: AssessmentAttemptDocument,
  assessment: Pick<
    AssessmentDocument,
    | 'title'
    | 'durationMinutes'
    | 'totalMarks'
    | 'passingPercentage'
    | 'sections'
    | 'status'
    | 'showResultImmediately'
    | 'showCorrectAnswersAfterResult'
    | 'allowReviewAfterSubmit'
  >,
): StudentAttemptDto {
  const resultVisible = isAttemptResultVisible(assessment, attempt)
  const revealCorrectness = isCorrectAnswerReviewVisible(assessment, attempt)
  const allowReview =
    attempt.status !== 'IN_PROGRESS' && (assessment.allowReviewAfterSubmit || resultVisible)

  return {
    id: attempt._id.toString(),
    attemptCode: attempt.attemptCode,
    assessmentId: attempt.assessmentId.toString(),
    assessmentTitle: assessment.title,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    durationMinutes: assessment.durationMinutes,
    totalMarks: assessment.totalMarks,
    passingPercentage: assessment.passingPercentage,
    sections: [...assessment.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section._id.toString(),
        title: section.title,
        instructions: section.instructions,
        order: section.order,
      })),
    questions: mapAttemptQuestions(attempt, {
      revealCorrectness,
      includeGrading: resultVisible,
    }),
    resultVisible,
    objectiveMarks: resultVisible ? attempt.objectiveMarks : null,
    manualMarks: resultVisible ? attempt.manualMarks : null,
    totalMarksAwarded: resultVisible ? attempt.totalMarksAwarded : null,
    percentage: resultVisible ? attempt.percentage : null,
    passStatus: resultVisible ? attempt.passStatus : null,
    allowReview,
  }
}

export interface GraderAttemptDto {
  id: string
  attemptCode: string
  assessmentId: string
  assessmentTitle: string
  studentId: string
  studentCode: string
  studentName: string
  batchId: string
  attemptNumber: number
  status: AssessmentAttemptDocument['status']
  submissionMethod: AssessmentAttemptDocument['submissionMethod']
  startedAt: string
  expiresAt: string
  submittedAt: string | null
  gradedAt: string | null
  totalMarks: number
  passingPercentage: number | null
  objectiveMarks: number | null
  manualMarks: number | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  focusLossCount: number
  questions: AttemptQuestionDto[]
}

/** Full detail for the grading workspace — a grader (trainer/admin) is always authorized to see correctness, regardless of the assessment's own student-facing result-visibility settings. */
export function toGraderAttemptDto(
  attempt: AssessmentAttemptDocument,
  assessment: Pick<AssessmentDocument, 'title' | 'totalMarks' | 'passingPercentage'>,
  student: Pick<StudentDocument, '_id' | 'studentId' | 'firstName' | 'lastName'>,
): GraderAttemptDto {
  return {
    id: attempt._id.toString(),
    attemptCode: attempt.attemptCode,
    assessmentId: attempt.assessmentId.toString(),
    assessmentTitle: assessment.title,
    studentId: student._id.toString(),
    studentCode: student.studentId,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    batchId: attempt.batchId.toString(),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    submissionMethod: attempt.submissionMethod,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    gradedAt: attempt.gradedAt ? attempt.gradedAt.toISOString() : null,
    totalMarks: assessment.totalMarks,
    passingPercentage: assessment.passingPercentage,
    objectiveMarks: attempt.objectiveMarks,
    manualMarks: attempt.manualMarks,
    totalMarksAwarded: attempt.totalMarksAwarded,
    percentage: attempt.percentage,
    passStatus: attempt.passStatus,
    focusLossCount: attempt.focusLossCount,
    questions: mapAttemptQuestions(attempt, { revealCorrectness: true, includeGrading: true }),
  }
}

export interface AttemptSummaryDto {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  attemptNumber: number
  status: AssessmentAttemptDocument['status']
  submittedAt: string | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  pendingManualCount: number
}

export function toAttemptSummaryDto(
  attempt: AssessmentAttemptDocument,
  student: Pick<StudentDocument, '_id' | 'studentId' | 'firstName' | 'lastName'>,
): AttemptSummaryDto {
  const pendingManualCount = attempt.questionSnapshot.filter((question) => {
    if (!question.requiresManualGrading) return false
    const answer = attempt.answers.find(
      (a) => a.questionId.toString() === question.questionId.toString(),
    )
    return answer?.marksAwarded === null || answer?.marksAwarded === undefined
  }).length

  return {
    id: attempt._id.toString(),
    studentId: student._id.toString(),
    studentCode: student.studentId,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    totalMarksAwarded: attempt.totalMarksAwarded,
    percentage: attempt.percentage,
    passStatus: attempt.passStatus,
    pendingManualCount,
  }
}
