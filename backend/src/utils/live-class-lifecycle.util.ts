import type { LiveClassStatus } from '../models/live-class.model'

/**
 * Single source of truth for the live-class session state machine — every
 * lifecycle service method looks itself up here (same discipline
 * `enrollment-lifecycle.util.ts` established). `COMPLETE` is reachable from
 * both `SCHEDULED` and `LIVE` — an admin marking a session complete after
 * the fact without ever clicking "Start" is a legitimate operational need
 * (task's own diagram shows the primary path but doesn't forbid this).
 * There is no generic PATCH-to-any-status — only these named transitions.
 */
const ALLOWED_TRANSITIONS: Record<LiveClassStatus, readonly LiveClassStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['LIVE', 'COMPLETED', 'CANCELLED'],
  LIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransitionLiveClass(from: LiveClassStatus, to: LiveClassStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export const TERMINAL_LIVE_CLASS_STATUSES: readonly LiveClassStatus[] = ['COMPLETED', 'CANCELLED']

export function isTerminalLiveClassStatus(status: LiveClassStatus): boolean {
  return TERMINAL_LIVE_CLASS_STATUSES.includes(status)
}

/** A session is editable (title/time/trainers/etc.) only while it hasn't started — same "DRAFT: editable" / "SCHEDULED: students can see it" boundary the task's own rules describe, extended to also allow correcting a still-upcoming SCHEDULED session. */
export function isLiveClassEditable(status: LiveClassStatus): boolean {
  return status === 'DRAFT' || status === 'SCHEDULED'
}

/** Students can see/join a session only once it's been published (`SCHEDULED`) or is actively happening (`LIVE`) — never a `DRAFT` still being set up. */
export function isLiveClassStudentVisible(status: LiveClassStatus): boolean {
  return status === 'SCHEDULED' || status === 'LIVE'
}
