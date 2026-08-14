import type { AssessmentDocument, AssessmentStatus } from '../models/assessment.model'

/** Explicit named-transition state machine — mirrors `assignment-lifecycle.util.ts`/`live-class-lifecycle.util.ts` exactly. Never a generic status `PATCH`. `CANCELLED` is reachable only from `DRAFT`/`PUBLISHED` (task's own explicit rule) — once `CLOSED`, the only forward paths are publishing results or archiving. */
const ALLOWED_TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CLOSED', 'CANCELLED'],
  CLOSED: ['RESULT_PUBLISHED'],
  RESULT_PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
}

export function canTransitionAssessment(from: AssessmentStatus, to: AssessmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export const TERMINAL_ASSESSMENT_STATUSES: readonly AssessmentStatus[] = ['ARCHIVED', 'CANCELLED']

export function isTerminalAssessmentStatus(status: AssessmentStatus): boolean {
  return TERMINAL_ASSESSMENT_STATUSES.includes(status)
}

/** Full authoring (basic info, timing, rules, sections/questions) is only possible before an assessment has ever been visible to a student — same restriction `isAssignmentEditable` applies, and for the same reason: once published, a student may already be mid-attempt against a specific question snapshot, so structural edits must not retroactively change what "the assessment" means. */
export function isAssessmentEditable(status: AssessmentStatus): boolean {
  return status === 'DRAFT'
}

/** A student can see this assessment (list/detail) — `PUBLISHED` (may still be attemptable or just outside its time window), `CLOSED` (no new attempts, but "Submitted / Awaiting Result" must remain visible), or `RESULT_PUBLISHED` (the actual result is now visible). `ARCHIVED`/`CANCELLED`/`DRAFT` are never listed for a student. */
export function isAssessmentStudentVisible(status: AssessmentStatus): boolean {
  return status === 'PUBLISHED' || status === 'CLOSED' || status === 'RESULT_PUBLISHED'
}

/**
 * The single, always-recomputed source of truth for "can a student start or
 * resume an attempt right now" — deliberately **not** a stored `OPEN`
 * status (see `assessment.model.ts`'s own doc comment on `ASSESSMENT_STATUSES`).
 * `status` must be the explicit `PUBLISHED` state (an admin action), and the
 * current time must additionally fall within `[openAt, closeAt]` where those
 * bounds are set (either may be `null`, meaning unbounded on that side).
 */
export function isAssessmentAcceptingAttempts(
  assessment: Pick<AssessmentDocument, 'status' | 'openAt' | 'closeAt'>,
  now: Date,
): boolean {
  if (assessment.status !== 'PUBLISHED') return false
  if (assessment.openAt && now < assessment.openAt) return false
  if (assessment.closeAt && now > assessment.closeAt) return false
  return true
}
