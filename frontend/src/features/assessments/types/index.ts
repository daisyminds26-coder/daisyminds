import type { QuestionType } from '@/features/question-bank/types'

/** Mirrors `backend/src/models/assessment.model.ts` enums exactly. */
export const ASSESSMENT_TYPES = ['QUIZ', 'EXAM'] as const
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number]

export const ASSESSMENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
  'RESULT_PUBLISHED',
  'ARCHIVED',
  'CANCELLED',
] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

export const ASSESSMENT_ATTEMPT_STATUSES = [
  'IN_PROGRESS',
  'PENDING_MANUAL_GRADING',
  'GRADED',
  'INVALIDATED',
] as const
export type AssessmentAttemptStatus = (typeof ASSESSMENT_ATTEMPT_STATUSES)[number]

export type PassStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE'

export interface AssessmentBatchSummary {
  id: string
  batchCode: string
  name: string
}

export interface AssessmentSectionQuestionSummary {
  id: string
  questionCode: string
  questionText: string
  questionType: QuestionType
  marks: number
}

export interface AdminAssessmentSection {
  id: string
  title: string
  instructions: string | null
  order: number
  randomQuestionCount: number | null
  questions: AssessmentSectionQuestionSummary[]
}

export interface AssessmentAttemptCounts {
  totalAttempts: number
  pendingGrading: number
  graded: number
  passed: number
  failed: number
}

/** Mirrors `backend/src/services/assessment-dto.ts#AdminAssessmentDto` — shared by the admin and trainer surfaces. */
export interface AdminAssessment {
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
  sections: AdminAssessmentSection[]
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

export interface ListAssessmentsParams {
  page?: number
  limit?: number
  sort?: `${'openAt' | 'createdAt'}:${'asc' | 'desc'}`
  courseId?: string
  batchId?: string
  assessmentType?: AssessmentType
  status?: AssessmentStatus
  search?: string
}

export interface CreateAssessmentPayload {
  courseId: string
  assessmentType: AssessmentType
  batchIds: string[]
  title: string
  description?: string
  instructions?: string
  timezone: string
  openAt?: string
  closeAt?: string
  durationMinutes: number
  maxAttempts?: number
  passingPercentage?: number
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  showResultImmediately?: boolean
  showCorrectAnswersAfterResult?: boolean
  allowReviewAfterSubmit?: boolean
  negativeMarkingEnabled?: boolean
}

export type UpdateAssessmentPayload = Partial<Omit<CreateAssessmentPayload, 'assessmentType'>> & {
  assessmentType?: AssessmentType
}

export interface SectionInputPayload {
  title: string
  instructions?: string
  order: number
  questionIds: string[]
  randomQuestionCount?: number
}

export interface ReadinessBlocker {
  field: string
  message: string
}

export interface ReadinessResult {
  ready: boolean
  blockers: ReadinessBlocker[]
}

export interface AttemptQuestionOption {
  id: string
  text: string
  isCorrect?: boolean
}

export interface AttemptQuestion {
  questionId: string
  sectionId: string
  order: number
  questionType: QuestionType
  questionText: string
  marks: number
  negativeMarks: number | null
  options: AttemptQuestionOption[]
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

/** Mirrors `backend/src/services/assessment-attempt-dto.ts#GraderAttemptDto`. */
export interface GraderAttempt {
  id: string
  attemptCode: string
  assessmentId: string
  assessmentTitle: string
  studentId: string
  studentCode: string
  studentName: string
  batchId: string
  attemptNumber: number
  status: AssessmentAttemptStatus
  submissionMethod: 'MANUAL' | 'AUTO_EXPIRY' | null
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
  questions: AttemptQuestion[]
}

/** Mirrors `backend/src/services/assessment-attempt-dto.ts#AttemptSummaryDto`. */
export interface AttemptSummary {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  attemptNumber: number
  status: AssessmentAttemptStatus
  submittedAt: string | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  pendingManualCount: number
}

export interface ListAttemptsParams {
  status?: AssessmentAttemptStatus
  passStatus?: PassStatus
  search?: string
}

export interface GradeEntryPayload {
  questionId: string
  marksAwarded: number
  feedback?: string
}

export interface GradeAttemptPayload {
  grades: GradeEntryPayload[]
}
