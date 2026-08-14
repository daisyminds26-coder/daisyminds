import type {
  AttemptQuestion,
  AssessmentAttemptStatus,
  AssessmentStatus,
  AssessmentType,
  PassStatus,
} from '@/features/assessments/types'

export type { AttemptQuestion, AssessmentAttemptStatus, PassStatus }

export interface AttemptHistoryRow {
  id: string
  attemptNumber: number
  status: AssessmentAttemptStatus
  submittedAt: string | null
  percentage: number | null
  passStatus: PassStatus | null
  resultVisible: boolean
}

/** Mirrors `backend/src/services/student-assessment-dto.ts#StudentAssessmentDto`. */
export interface StudentAssessment {
  id: string
  assessmentCode: string
  assessmentType: AssessmentType
  title: string
  courseTitle: string
  batchName: string
  status: AssessmentStatus
  isAcceptingAttempts: boolean
  openAt: string | null
  closeAt: string | null
  durationMinutes: number
  maxAttempts: number
  totalMarks: number
  passingPercentage: number | null
  attemptsUsed: number
  currentAttemptId: string | null
  latestAttempt: AttemptHistoryRow | null
  bestAttempt: AttemptHistoryRow | null
  canStart: boolean
}

export interface StudentAssessmentDetail extends StudentAssessment {
  description: string | null
  instructions: string | null
  negativeMarkingEnabled: boolean
  allowReviewAfterSubmit: boolean
  pastAttempts: AttemptHistoryRow[]
}

/** Mirrors `backend/src/services/assessment-attempt-dto.ts#StudentAttemptDto`. */
export interface StudentAttempt {
  id: string
  attemptCode: string
  assessmentId: string
  assessmentTitle: string
  attemptNumber: number
  status: AssessmentAttemptStatus
  startedAt: string
  expiresAt: string
  submittedAt: string | null
  durationMinutes: number
  totalMarks: number
  passingPercentage: number | null
  sections: { id: string; title: string; instructions: string | null; order: number }[]
  questions: AttemptQuestion[]
  resultVisible: boolean
  objectiveMarks: number | null
  manualMarks: number | null
  totalMarksAwarded: number | null
  percentage: number | null
  passStatus: PassStatus | null
  allowReview: boolean
}

export interface AnswerEntryPayload {
  questionId: string
  selectedOptionIds?: string[]
  booleanAnswer?: boolean
  textAnswer?: string
  numericAnswer?: number
  flaggedForReview?: boolean
}
