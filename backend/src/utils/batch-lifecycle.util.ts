import type { BatchStatus } from '../models/batch.model'

/**
 * The explicit transition matrix — every lifecycle action in
 * `batch-management.service.ts` looks itself up here rather than hand-
 * rolling an `if` chain, so the *complete* set of legal moves lives in one
 * place, is unit-testable on its own, and is guaranteed 1:1 with the
 * dedicated lifecycle endpoints (never a generic "set any status" PATCH —
 * ARCHITECTURE.md's Batch Management section). `COMPLETED -> ARCHIVED` and
 * `CANCELLED -> ARCHIVED` are terminal-then-archived, matching the task's
 * explicit "do not allow COMPLETED/CANCELLED/ARCHIVED -> ACTIVE directly"
 * rule — there is no path back into `ACTIVE` from any of the three without
 * an explicit, separate restore-then-reschedule sequence.
 */
const ALLOWED_TRANSITIONS: Record<BatchStatus, readonly BatchStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['DRAFT', 'ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: ['DRAFT'],
}

export function canTransition(from: BatchStatus, to: BatchStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function allowedNextStatuses(from: BatchStatus): readonly BatchStatus[] {
  return ALLOWED_TRANSITIONS[from]
}
