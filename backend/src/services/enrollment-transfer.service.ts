import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { withTransaction } from '../utils/transaction'
import { doesEnrollmentConsumeSeat } from '../utils/enrollment-lifecycle.util'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { batchRepository } from '../repositories/batch.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { generateEnrollmentCode } from './enrollment-id.service'
import { enrollmentCapacityService } from './enrollment-capacity.service'
import { toDto, type AdminEnrollmentDto } from './enrollment-management.service'
import type { EnrollmentStatus } from '../models/enrollment.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const ENROLLABLE_BATCH_STATUSES = ['SCHEDULED', 'ACTIVE']
const TRANSFERABLE_SOURCE_STATUSES: readonly EnrollmentStatus[] = [
  'CONFIRMED',
  'ACTIVE',
  'SUSPENDED',
]

async function recordAudit(
  action: string,
  entityId: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown>,
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: 'enrollment',
    entityId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

/**
 * Moves a student from one batch to another *within the same course* — the
 * only supported mechanism for "student wants the evening batch instead of
 * the morning one," never a second concurrent enrollment (ARCHITECTURE.md
 * §23). Fully atomic: source-seat-release, target-seat-reservation-or-
 * waitlist, the new enrollment document, and the source's `DROPPED`
 * transition all happen inside one transaction — if target-seat reservation
 * fails, the whole thing rolls back, including the source seat release, so
 * a student can never end up holding zero seats mid-transfer.
 */
export const enrollmentTransferService = {
  async transferEnrollment(
    sourceEnrollmentId: string,
    targetBatchId: string,
    reason: string | undefined,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminEnrollmentDto> {
    const source = await enrollmentRepository.findById(sourceEnrollmentId)
    if (!source) throw ApiError.notFound('Enrollment not found')
    if (!TRANSFERABLE_SOURCE_STATUSES.includes(source.status)) {
      throw ApiError.conflict(
        `An enrollment in ${source.status} status cannot be transferred — only CONFIRMED, ACTIVE, or SUSPENDED can`,
      )
    }
    if (source.batchId.toString() === targetBatchId) {
      throw ApiError.badRequest('Cannot transfer an enrollment to its own current batch')
    }

    const targetBatch = await batchRepository.findById(targetBatchId)
    if (!targetBatch) {
      throw ApiError.badRequest('Target batch not found', [
        { field: 'targetBatchId', message: 'Target batch not found' },
      ])
    }
    if (targetBatch.courseId.toString() !== source.courseId.toString()) {
      throw ApiError.badRequest('A transfer must stay within the same course', [
        { field: 'targetBatchId', message: 'Target batch belongs to a different course' },
      ])
    }
    if (!ENROLLABLE_BATCH_STATUSES.includes(targetBatch.status)) {
      throw ApiError.conflict(`Batches in ${targetBatch.status} status cannot accept a transfer`)
    }

    const existingTarget = await enrollmentRepository.findByStudentAndBatch(
      source.studentId.toString(),
      targetBatchId,
    )
    if (existingTarget) {
      throw ApiError.conflict('The student already has an enrollment in the target batch')
    }

    const enrollmentCode = await generateEnrollmentCode()
    const now = new Date()

    const target = await withTransaction(async (session) => {
      if (doesEnrollmentConsumeSeat(source.status)) {
        await enrollmentCapacityService.releaseSeat(source.batchId.toString(), session)
      }

      const reservation = await enrollmentCapacityService.reserveSeatOrWaitlist(
        targetBatchId,
        targetBatch.waitlistEnabled,
        session,
      )
      if (!reservation.seatReserved && reservation.waitlistPosition === null) {
        throw ApiError.conflict('The target batch is full and does not accept a waitlist')
      }

      const status: EnrollmentStatus = reservation.seatReserved
        ? source.status === 'ACTIVE' && targetBatch.status === 'ACTIVE'
          ? 'ACTIVE'
          : 'CONFIRMED'
        : 'WAITLISTED'
      const waitlistPosition = reservation.seatReserved ? null : reservation.waitlistPosition

      const created = await enrollmentRepository.create(
        {
          enrollmentCode,
          studentId: source.studentId,
          batchId: new Types.ObjectId(targetBatchId),
          courseId: source.courseId,
          status,
          source: 'TRANSFER',
          enrollmentDate: now,
          confirmedAt: status !== 'WAITLISTED' ? now : null,
          activatedAt: status === 'ACTIVE' ? now : null,
          accessStartsAt: status === 'ACTIVE' ? now : null,
          waitlistedAt: status === 'WAITLISTED' ? now : null,
          waitlistPosition,
          transferredFromEnrollmentId: source._id,
          transferReason: reason ?? null,
          createdBy: new Types.ObjectId(actor.id),
          updatedBy: new Types.ObjectId(actor.id),
        },
        session,
      )

      await enrollmentRepository.updateById(
        sourceEnrollmentId,
        {
          status: 'DROPPED',
          droppedAt: now,
          accessEndsAt: now,
          transferredToEnrollmentId: created._id,
          transferReason: reason ?? null,
          updatedBy: actor.id,
        },
        session,
      )

      return created
    })

    await recordAudit('enrollment.transferred_out', sourceEnrollmentId, actor, context, {
      targetBatchId,
      targetEnrollmentId: target._id.toString(),
      reason,
    })
    await recordAudit('enrollment.transferred_in', target._id.toString(), actor, context, {
      sourceBatchId: source.batchId.toString(),
      sourceEnrollmentId,
      reason,
    })

    return toDto(target)
  },
}
