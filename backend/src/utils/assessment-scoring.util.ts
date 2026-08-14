import type { IQuestion } from '../models/question.model'
import type {
  IAssessmentAttemptAnswer,
  IAssessmentAttemptQuestionSnapshot,
  PassStatus,
} from '../models/assessment-attempt.model'
import type { AssessmentDocument } from '../models/assessment.model'
import type { AssessmentAttemptDocument } from '../models/assessment-attempt.model'

/**
 * The one place that decides auto- vs manual-gradability, shared by question
 * authoring (to show the right fields) and attempt scoring (to decide the
 * per-question path) — never duplicated. `FILL_IN_THE_BLANK` is manual by
 * default and only auto-graded when `acceptedAnswers` was explicitly
 * configured (task's own explicit rule); every other type is fixed.
 */
export function requiresManualGrading(
  question: Pick<IQuestion, 'questionType' | 'acceptedAnswers'>,
): boolean {
  switch (question.questionType) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    case 'NUMERIC':
      return false
    case 'FILL_IN_THE_BLANK':
      return question.acceptedAnswers.length === 0
    case 'SHORT_ANSWER':
    case 'LONG_ANSWER':
      return true
  }
}

export interface ScoredAnswer {
  marksAwarded: number | null
  isCorrect: boolean | null
}

/**
 * One objectively-gradable question, scored server-side, never trusting a
 * client-reported correctness flag. `isCorrect: null` + `marksAwarded: 0`
 * means "unanswered" (spec's own explicit "unanswered: 0 penalty" rule) —
 * distinct from "answered but wrong," which is the only case negative
 * marking ever applies to.
 */
export function scoreObjectiveAnswer(
  snapshot: IAssessmentAttemptQuestionSnapshot,
  answer: IAssessmentAttemptAnswer | undefined,
  negativeMarkingEnabled: boolean,
): ScoredAnswer {
  // `|| 0` below normalizes `-0` to `0` on every wrong-answer path when `negativePenalty` is itself 0 (negative marking off, or `negativeMarks` unset) — arithmetically identical, but avoids a `-0` ever reaching storage/JSON/equality checks.
  const negativePenalty = negativeMarkingEnabled ? (snapshot.negativeMarks ?? 0) : 0

  switch (snapshot.questionType) {
    case 'SINGLE_CHOICE': {
      const selected = answer?.selectedOptionIds ?? []
      if (selected.length === 0) return { marksAwarded: 0, isCorrect: null }
      const correctOption = snapshot.options.find((option) => option.isCorrect)
      const isCorrect =
        selected.length === 1 &&
        correctOption !== undefined &&
        selected[0]?.toString() === correctOption._id.toString()
      return isCorrect
        ? { marksAwarded: snapshot.marks, isCorrect: true }
        : { marksAwarded: -negativePenalty || 0, isCorrect: false }
    }
    case 'MULTIPLE_CHOICE': {
      const selected = answer?.selectedOptionIds ?? []
      if (selected.length === 0) return { marksAwarded: 0, isCorrect: null }
      const correctIds = new Set(
        snapshot.options
          .filter((option) => option.isCorrect)
          .map((option) => option._id.toString()),
      )
      const selectedIds = new Set(selected.map((id) => id.toString()))
      // All-or-nothing (V1 policy, task's own recommendation) — no partial credit.
      const isCorrect =
        correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id))
      return isCorrect
        ? { marksAwarded: snapshot.marks, isCorrect: true }
        : { marksAwarded: -negativePenalty || 0, isCorrect: false }
    }
    case 'TRUE_FALSE': {
      const value = answer?.booleanAnswer ?? null
      if (value === null) return { marksAwarded: 0, isCorrect: null }
      const isCorrect = value === snapshot.correctBoolean
      return isCorrect
        ? { marksAwarded: snapshot.marks, isCorrect: true }
        : { marksAwarded: -negativePenalty || 0, isCorrect: false }
    }
    case 'FILL_IN_THE_BLANK': {
      // Only reached when the snapshot itself is not `requiresManualGrading` (i.e. `acceptedAnswers` was configured).
      const text = answer?.textAnswer?.trim().toLowerCase() ?? ''
      if (text.length === 0) return { marksAwarded: 0, isCorrect: null }
      const isCorrect = snapshot.acceptedAnswers.some(
        (accepted) => accepted.trim().toLowerCase() === text,
      )
      return isCorrect
        ? { marksAwarded: snapshot.marks, isCorrect: true }
        : { marksAwarded: -negativePenalty || 0, isCorrect: false }
    }
    case 'NUMERIC': {
      const value = answer?.numericAnswer
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return { marksAwarded: 0, isCorrect: null }
      }
      const isCorrect =
        snapshot.correctNumericAnswer !== null && value === snapshot.correctNumericAnswer
      return isCorrect
        ? { marksAwarded: snapshot.marks, isCorrect: true }
        : { marksAwarded: -negativePenalty || 0, isCorrect: false }
    }
    case 'SHORT_ANSWER':
    case 'LONG_ANSWER':
      return { marksAwarded: null, isCorrect: null }
  }
}

/**
 * Scores every objectively-gradable question in one pass over the snapshot,
 * returning the full updated answer list (never mutating the input array)
 * plus the raw (unfloored) objective total. Manual-grade questions are left
 * exactly as they were — this function never touches `manualFeedback` or a
 * previously-saved manual `marksAwarded`.
 */
export function scoreAttemptObjectively(
  snapshot: readonly IAssessmentAttemptQuestionSnapshot[],
  answers: readonly IAssessmentAttemptAnswer[],
  negativeMarkingEnabled: boolean,
): { answers: IAssessmentAttemptAnswer[]; objectiveMarksRaw: number } {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.questionId.toString(), answer]),
  )
  let objectiveMarksRaw = 0

  const updated = snapshot.map((question): IAssessmentAttemptAnswer => {
    const existing = answerByQuestionId.get(question.questionId.toString()) ?? {
      questionId: question.questionId,
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
    if (question.requiresManualGrading) return existing

    const scored = scoreObjectiveAnswer(question, existing, negativeMarkingEnabled)
    objectiveMarksRaw += scored.marksAwarded ?? 0
    return { ...existing, marksAwarded: scored.marksAwarded, isCorrect: scored.isCorrect }
  })

  return { answers: updated, objectiveMarksRaw }
}

/** Sums the already-graded manual questions and reports whether every manual question in the snapshot has been graded — the single check that decides `PENDING_MANUAL_GRADING` vs. `GRADED` (an assessment with zero manual questions trivially reports `allManualGraded: true`). */
export function computeManualGradingProgress(
  snapshot: readonly IAssessmentAttemptQuestionSnapshot[],
  answers: readonly IAssessmentAttemptAnswer[],
): { manualMarks: number; allManualGraded: boolean } {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.questionId.toString(), answer]),
  )
  let manualMarks = 0
  let allManualGraded = true

  for (const question of snapshot) {
    if (!question.requiresManualGrading) continue
    const marksAwarded = answerByQuestionId.get(question.questionId.toString())?.marksAwarded
    if (marksAwarded === null || marksAwarded === undefined) {
      allManualGraded = false
    } else {
      manualMarks += marksAwarded
    }
  }

  return { manualMarks, allManualGraded }
}

export interface FinalizedScore {
  objectiveMarks: number
  manualMarks: number
  totalMarksAwarded: number
  percentage: number
  passStatus: PassStatus
}

/**
 * The negative-marking floor is applied here, once, to the *objective*
 * subtotal only (`Math.max(0, objectiveMarksRaw)`) — manual marks are
 * already always non-negative by construction (bounded `0..question.marks`
 * at grading-save time), so their sum can never pull the total back down.
 * The result is that `totalMarksAwarded` (their sum) is always `>= 0`
 * without a second, redundant floor at the end — task's own "assessment
 * total cannot go below 0" rule, satisfied at a single, well-defined point.
 */
export function finalizeAttemptScore(
  objectiveMarksRaw: number,
  manualMarks: number,
  totalMarks: number,
  passingPercentage: number | null,
): FinalizedScore {
  const objectiveMarks = Math.max(0, objectiveMarksRaw)
  const totalMarksAwarded = objectiveMarks + manualMarks
  const percentage = totalMarks > 0 ? Math.round((totalMarksAwarded / totalMarks) * 10000) / 100 : 0
  const passStatus: PassStatus =
    passingPercentage === null
      ? 'NOT_APPLICABLE'
      : percentage >= passingPercentage
        ? 'PASS'
        : 'FAIL'
  return { objectiveMarks, manualMarks, totalMarksAwarded, percentage, passStatus }
}

/** `expiresAt` is always authoritative server-side (task's own explicit rule: "Frontend must not determine these") — the earlier of the attempt's own duration and the assessment's hard `closeAt`, when set. */
export function computeAttemptExpiry(
  startedAt: Date,
  durationMinutes: number,
  closeAt: Date | null,
): Date {
  const byDuration = new Date(startedAt.getTime() + durationMinutes * 60_000)
  if (closeAt && closeAt < byDuration) return closeAt
  return byDuration
}

/**
 * Result visibility gate — evaluated fresh on every read, never cached or
 * trusted from `attempt.resultVisibleAt` (that field is purely informational,
 * see `assessment-attempt.model.ts`). Grading must be fully complete
 * (`status === 'GRADED'`) regardless of any other setting — "if manual
 * grading required, result waits regardless" (task's own explicit rule).
 */
export function isAttemptResultVisible(
  assessment: Pick<AssessmentDocument, 'status' | 'showResultImmediately'>,
  attempt: Pick<AssessmentAttemptDocument, 'status'>,
): boolean {
  if (attempt.status !== 'GRADED') return false
  if (assessment.status === 'RESULT_PUBLISHED') return true
  return assessment.showResultImmediately
}

export function isCorrectAnswerReviewVisible(
  assessment: Pick<
    AssessmentDocument,
    'status' | 'showResultImmediately' | 'showCorrectAnswersAfterResult'
  >,
  attempt: Pick<AssessmentAttemptDocument, 'status'>,
): boolean {
  return isAttemptResultVisible(assessment, attempt) && assessment.showCorrectAnswersAfterResult
}
