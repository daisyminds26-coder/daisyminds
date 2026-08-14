import type {
  AssessmentDocument,
  AssessmentStatus,
  AssessmentType,
} from '../models/assessment.model'
import type { AssessmentAttemptDocument, PassStatus } from '../models/assessment-attempt.model'
import { isAssessmentAcceptingAttempts } from '../utils/assessment-lifecycle.util'
import { isAttemptResultVisible } from '../utils/assessment-scoring.util'

export interface AttemptHistoryRowDto {
  id: string
  attemptNumber: number
  status: AssessmentAttemptDocument['status']
  submittedAt: string | null
  percentage: number | null
  passStatus: PassStatus | null
  resultVisible: boolean
}

export interface StudentAssessmentDto {
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
  latestAttempt: AttemptHistoryRowDto | null
  bestAttempt: AttemptHistoryRowDto | null
  canStart: boolean
}

export interface StudentAssessmentDetailDto extends StudentAssessmentDto {
  description: string | null
  instructions: string | null
  negativeMarkingEnabled: boolean
  allowReviewAfterSubmit: boolean
  pastAttempts: AttemptHistoryRowDto[]
}

function toHistoryRow(
  attempt: AssessmentAttemptDocument,
  assessment: Pick<AssessmentDocument, 'status' | 'showResultImmediately'>,
): AttemptHistoryRowDto {
  return {
    id: attempt._id.toString(),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    percentage: attempt.percentage,
    passStatus: attempt.passStatus,
    resultVisible: isAttemptResultVisible(assessment, attempt),
  }
}

export function toStudentAssessmentDto(
  assessment: AssessmentDocument,
  courseTitle: string,
  batchName: string,
  attempts: AssessmentAttemptDocument[],
  canSubmitOverride?: boolean,
): StudentAssessmentDto {
  const sorted = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)
  const current = sorted.find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
  const latest = sorted[0] ?? null
  const graded = sorted.filter(
    (attempt) => attempt.status === 'GRADED' && attempt.percentage !== null,
  )
  const best = graded.reduce<AssessmentAttemptDocument | null>((acc, attempt) => {
    if (!acc) return attempt
    return (attempt.percentage ?? 0) > (acc.percentage ?? 0) ? attempt : acc
  }, null)

  const isAcceptingAttempts = isAssessmentAcceptingAttempts(assessment, new Date())
  const canStart =
    canSubmitOverride ??
    (current !== null || (isAcceptingAttempts && attempts.length < assessment.maxAttempts))

  return {
    id: assessment._id.toString(),
    assessmentCode: assessment.assessmentCode,
    assessmentType: assessment.assessmentType,
    title: assessment.title,
    courseTitle,
    batchName,
    status: assessment.status,
    isAcceptingAttempts,
    openAt: assessment.openAt ? assessment.openAt.toISOString() : null,
    closeAt: assessment.closeAt ? assessment.closeAt.toISOString() : null,
    durationMinutes: assessment.durationMinutes,
    maxAttempts: assessment.maxAttempts,
    totalMarks: assessment.totalMarks,
    passingPercentage: assessment.passingPercentage,
    attemptsUsed: attempts.length,
    currentAttemptId: current ? current._id.toString() : null,
    latestAttempt: latest ? toHistoryRow(latest, assessment) : null,
    bestAttempt: best ? toHistoryRow(best, assessment) : null,
    canStart,
  }
}

export function toStudentAssessmentDetailDto(
  base: StudentAssessmentDto,
  assessment: Pick<
    AssessmentDocument,
    | 'description'
    | 'instructions'
    | 'negativeMarkingEnabled'
    | 'allowReviewAfterSubmit'
    | 'status'
    | 'showResultImmediately'
  >,
  attempts: AssessmentAttemptDocument[],
): StudentAssessmentDetailDto {
  const sorted = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)
  return {
    ...base,
    description: assessment.description,
    instructions: assessment.instructions,
    negativeMarkingEnabled: assessment.negativeMarkingEnabled,
    allowReviewAfterSubmit: assessment.allowReviewAfterSubmit,
    pastAttempts: sorted
      .filter((attempt) => attempt.status !== 'IN_PROGRESS')
      .map((attempt) => toHistoryRow(attempt, assessment)),
  }
}
