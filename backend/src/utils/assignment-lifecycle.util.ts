import type { AssignmentStatus } from '../models/assignment.model'

/** Explicit named-transition state machine — mirrors `live-class-lifecycle.util.ts`'s pattern exactly. Never a generic status `PATCH`. */
const ALLOWED_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CLOSED', 'CANCELLED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
}

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export const TERMINAL_ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = ['ARCHIVED', 'CANCELLED']

export function isTerminalAssignmentStatus(status: AssignmentStatus): boolean {
  return TERMINAL_ASSIGNMENT_STATUSES.includes(status)
}

/** Editable (title/instructions/dates/marks/etc.) only before it's ever been visible to a student. */
export function isAssignmentEditable(status: AssignmentStatus): boolean {
  return status === 'DRAFT'
}

/** A student can see this assignment (list/detail) — `PUBLISHED` (can still submit) or `CLOSED` (submission disabled, but result/history must remain visible per the task's own instruction). */
export function isAssignmentStudentVisible(status: AssignmentStatus): boolean {
  return status === 'PUBLISHED' || status === 'CLOSED'
}

/** A student can create/update a submission — only while genuinely open. */
export function isAssignmentAcceptingSubmissions(status: AssignmentStatus): boolean {
  return status === 'PUBLISHED'
}
