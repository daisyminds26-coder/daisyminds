import type { EnrollmentStatus } from '../models/enrollment.model'

/**
 * Single source of truth for the enrollment state machine — every lifecycle
 * service method looks itself up here rather than hand-rolling conditionals
 * (same discipline `batch-lifecycle.util.ts` established in Phase 10A).
 * `ACTIVE -> CANCELLED` is included (task's own "only if operationally
 * allowed" — an admin cancelling an in-progress enrollment outright, as
 * distinct from a student-initiated `DROPPED`, is a legitimate operational
 * need and is documented as the deliberate choice here).
 */
const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
  PENDING: ['CONFIRMED', 'WAITLISTED', 'CANCELLED'],
  WAITLISTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'COMPLETED', 'DROPPED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'DROPPED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  DROPPED: [],
}

export function canTransitionEnrollment(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function allowedNextEnrollmentStatuses(from: EnrollmentStatus): readonly EnrollmentStatus[] {
  return ALLOWED_TRANSITIONS[from]
}

export const TERMINAL_ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'DROPPED',
]

export function isTerminalEnrollmentStatus(status: EnrollmentStatus): boolean {
  return TERMINAL_ENROLLMENT_STATUSES.includes(status)
}

/**
 * `CONFIRMED`/`ACTIVE`/`SUSPENDED` reserve a real seat; `PENDING` is an
 * administrative record not yet approved (the simpler of the two models the
 * task offered — chosen for predictability: a seat is only ever "spent" once
 * an admin has actually confirmed it). `WAITLISTED` and every terminal
 * status never consume a seat. Never scattered inline — every seat-affecting
 * code path calls this one helper.
 */
export const SEAT_CONSUMING_STATUSES: readonly EnrollmentStatus[] = [
  'CONFIRMED',
  'ACTIVE',
  'SUSPENDED',
]

export function doesEnrollmentConsumeSeat(status: EnrollmentStatus): boolean {
  return SEAT_CONSUMING_STATUSES.includes(status)
}
