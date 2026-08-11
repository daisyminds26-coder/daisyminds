import type { ClientSession } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { batchRepository } from '../repositories/batch.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { SEAT_CONSUMING_STATUSES } from '../utils/enrollment-lifecycle.util'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

export interface CapacitySnapshot {
  maxStudents: number
  occupiedSeats: number
  availableSeats: number
  waitlistCount: number
}

export interface WaitlistEntryDto {
  id: string
  enrollmentCode: string
  studentId: string
  studentCode: string | null
  studentName: string
  waitlistedAt: string | null
  waitlistPosition: number | null
}

/**
 * The one place seat/waitlist counters are ever mutated — every enrollment
 * lifecycle transition that changes seat consumption calls in here rather
 * than touching `batchRepository`'s atomic methods directly, so the
 * "which transitions cost/free a seat" business rule lives in exactly one
 * module (ARCHITECTURE.md §23).
 */
export const enrollmentCapacityService = {
  /**
   * Atomically reserves a seat if one is available; otherwise assigns the
   * next waitlist position. Always called from inside `withTransaction`
   * alongside the enrollment document write — if the caller's own write
   * fails afterward, the whole transaction (including this reservation)
   * rolls back, so a seat can never be "lost" to a failed enrollment.
   */
  async reserveSeatOrWaitlist(
    batchId: string,
    waitlistEnabled: boolean,
    session: ClientSession,
  ): Promise<{ seatReserved: true } | { seatReserved: false; waitlistPosition: number | null }> {
    const reserved = await batchRepository.reserveSeat(batchId, session)
    if (reserved) return { seatReserved: true }

    if (!waitlistEnabled) return { seatReserved: false, waitlistPosition: null }

    const waitlistPosition = await batchRepository.nextWaitlistPosition(batchId, session)
    return { seatReserved: false, waitlistPosition }
  },

  /** Same reservation used for a direct promotion (waitlist -> confirmed) — a thin, explicitly-named alias kept separate so call sites read as the business action they represent. */
  async reserveSeat(batchId: string, session: ClientSession): Promise<boolean> {
    const reserved = await batchRepository.reserveSeat(batchId, session)
    return reserved !== null
  },

  async releaseSeat(batchId: string, session: ClientSession): Promise<void> {
    await batchRepository.releaseSeat(batchId, session)
  },

  async getCapacitySnapshot(batchId: string): Promise<CapacitySnapshot> {
    const batch = await batchRepository.findById(batchId)
    if (!batch) throw ApiError.notFound('Batch not found')

    const waitlistCount = await enrollmentRepository.countSeatConsumingForBatch(batchId, [
      'WAITLISTED',
    ])
    return {
      maxStudents: batch.maxStudents,
      occupiedSeats: batch.occupiedSeats,
      availableSeats: Math.max(0, batch.maxStudents - batch.occupiedSeats),
      waitlistCount,
    }
  },

  async getWaitlist(batchId: string): Promise<WaitlistEntryDto[]> {
    const rows = await enrollmentRepository.findWaitlistForBatch(batchId)
    return rows.map((row) => ({
      id: row._id.toString(),
      enrollmentCode: row.enrollmentCode,
      studentId: row.studentId.toString(),
      studentCode: row.studentCode,
      studentName: `${row.studentFirstName ?? ''} ${row.studentLastName ?? ''}`.trim(),
      waitlistedAt: row.waitlistedAt ? row.waitlistedAt.toISOString() : null,
      waitlistPosition: row.waitlistPosition,
    }))
  },

  /** Authoritative seat-truth, derived from enrollment records — never used on a normal request path, only for the maintenance reconcile flow below and its tests. */
  calculateExpectedOccupiedSeats(batchId: string): Promise<number> {
    return enrollmentRepository.countSeatConsumingForBatch(batchId, SEAT_CONSUMING_STATUSES)
  },

  /**
   * SUPER_ADMIN-only maintenance operation (gated at the route layer) —
   * directly overwrites `batch.occupiedSeats` to the enrollment-derived
   * truth and audits the correction. Never invoked automatically; a
   * counter drift here would indicate a bug elsewhere (e.g. a direct DB
   * edit bypassing the service layer), not expected steady-state behavior.
   */
  async reconcileBatchOccupiedSeats(
    batchId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<{ before: number; after: number; corrected: boolean }> {
    const batch = await batchRepository.findById(batchId)
    if (!batch) throw ApiError.notFound('Batch not found')

    const expected = await this.calculateExpectedOccupiedSeats(batchId)
    const before = batch.occupiedSeats
    const corrected = before !== expected

    if (corrected) {
      await batchRepository.setOccupiedSeats(batchId, expected)
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'enrollment.capacity_reconciled',
        entityType: 'batch',
        entityId: batch._id,
        metadata: { before, after: expected },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    return { before, after: expected, corrected }
  },
}
