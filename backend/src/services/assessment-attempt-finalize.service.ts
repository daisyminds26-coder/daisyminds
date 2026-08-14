import { ApiError } from '../utils/api-error'
import {
  computeManualGradingProgress,
  finalizeAttemptScore,
  scoreAttemptObjectively,
} from '../utils/assessment-scoring.util'
import { assessmentAttemptRepository } from '../repositories/assessment-attempt.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type {
  AssessmentAttemptDocument,
  SubmissionMethod,
} from '../models/assessment-attempt.model'
import type { AssessmentDocument } from '../models/assessment.model'

const AUDIT_ENTITY_TYPE = 'assessment_attempt'

/**
 * The student who owns the attempt is always the audited actor here —
 * `attempt.createdBy` is that student's own `userId` (set at attempt
 * creation), which is the correct attribution regardless of *who* happened
 * to trigger a lazy expiry check (e.g. a trainer opening a grading view can
 * be what materializes an auto-submit, but the event is still "this
 * student's attempt was auto-submitted," not the trainer's action).
 */
async function recordAttemptAudit(
  attempt: AssessmentAttemptDocument,
  action: string,
): Promise<void> {
  await auditLogRepository.record({
    actorId: attempt.createdBy ? attempt.createdBy.toString() : attempt.studentId.toString(),
    actorRole: 'STUDENT',
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId: attempt._id.toString(),
    metadata: {
      assessmentId: attempt.assessmentId.toString(),
      attemptNumber: attempt.attemptNumber,
    },
    ipAddress: null,
    userAgent: null,
  })
}

/**
 * The one place an `IN_PROGRESS` attempt is scored and transitioned out of
 * that state — called by an explicit student submit (`submissionMethod:
 * 'MANUAL'`) and by lazy expiry detection (`'AUTO_EXPIRY'`, see
 * `materializeAttemptExpiry` below). Objective scoring is always synchronous
 * (a cheap reduction over an already-loaded snapshot — never a background
 * job), so this single call either reaches `GRADED` immediately (no manual
 * questions, or none happened to need it) or `PENDING_MANUAL_GRADING`.
 */
export async function finalizeAttemptSubmission(
  attempt: AssessmentAttemptDocument,
  assessment: AssessmentDocument,
  submissionMethod: SubmissionMethod,
): Promise<AssessmentAttemptDocument> {
  const now = new Date()
  const { answers, objectiveMarksRaw } = scoreAttemptObjectively(
    attempt.questionSnapshot,
    attempt.answers,
    assessment.negativeMarkingEnabled,
  )
  const { manualMarks, allManualGraded } = computeManualGradingProgress(
    attempt.questionSnapshot,
    answers,
  )

  const update: Record<string, unknown> = { answers, submittedAt: now, submissionMethod }
  if (allManualGraded) {
    const finalized = finalizeAttemptScore(
      objectiveMarksRaw,
      manualMarks,
      assessment.totalMarks,
      assessment.passingPercentage,
    )
    update.status = 'GRADED'
    update.objectiveMarks = finalized.objectiveMarks
    update.manualMarks = finalized.manualMarks
    update.totalMarksAwarded = finalized.totalMarksAwarded
    update.percentage = finalized.percentage
    update.passStatus = finalized.passStatus
    update.gradedAt = now
    if (assessment.showResultImmediately) update.resultVisibleAt = now
  } else {
    update.status = 'PENDING_MANUAL_GRADING'
    update.objectiveMarks = Math.max(0, objectiveMarksRaw)
    update.manualMarks = manualMarks
  }

  const updated = await assessmentAttemptRepository.updateById(attempt._id.toString(), update)
  if (!updated) throw ApiError.notFound('Attempt not found')

  await recordAttemptAudit(
    updated,
    submissionMethod === 'MANUAL'
      ? 'assessment.attempt_submitted'
      : 'assessment.attempt_auto_submitted',
  )

  return updated
}

/**
 * Lazy expiry — called at the top of every student-facing (and, defensively,
 * grader-facing) attempt read/write. There is no background sweep job this
 * phase (documented simplification, testing/hardening backlog item): "the
 * backend enforces expiry independently of the frontend timer" is satisfied
 * because this always runs before any other logic touches the attempt, not
 * because a cron job proactively closes abandoned attempts the moment they
 * expire. A truly abandoned attempt (never accessed again by anyone) simply
 * stays `IN_PROGRESS` in storage until the next read — which is harmless,
 * since no further writes to it are possible once its `expiresAt` has
 * passed (every write path re-runs this check first).
 */
export async function materializeAttemptExpiry(
  attempt: AssessmentAttemptDocument,
  assessment: AssessmentDocument,
): Promise<AssessmentAttemptDocument> {
  if (attempt.status !== 'IN_PROGRESS') return attempt
  if (new Date() <= attempt.expiresAt) return attempt
  return finalizeAttemptSubmission(attempt, assessment, 'AUTO_EXPIRY')
}
