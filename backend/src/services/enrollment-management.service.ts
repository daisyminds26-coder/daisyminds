import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { toCsv } from '../utils/csv'
import { withTransaction } from '../utils/transaction'
import {
  canTransitionEnrollment,
  doesEnrollmentConsumeSeat,
} from '../utils/enrollment-lifecycle.util'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { batchRepository } from '../repositories/batch.repository'
import { studentRepository } from '../repositories/student.repository'
import {
  enrollmentRepository,
  type ListEnrollmentsFilter,
  type ListEnrollmentsOptions,
  type EnrollmentListRow,
} from '../repositories/enrollment.repository'
import { generateEnrollmentCode } from './enrollment-id.service'
import { enrollmentCapacityService } from './enrollment-capacity.service'
import {
  computeEnrollmentAccessState,
  type EnrollmentAccessState,
} from './enrollment-access.service'
import { UserModel } from '../models/user.model'
import type { EnrollmentDocument, EnrollmentStatus } from '../models/enrollment.model'
import type { BulkEnrollInput, CreateEnrollmentInput } from '../validators/enrollment.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const MAX_EXPORT_ROWS = 5000
/** A batch must be actively taking students — matches `batch-readiness`'s own operational-status notion, but for enrollment eligibility rather than scheduling readiness. */
const ENROLLABLE_BATCH_STATUSES = ['SCHEDULED', 'ACTIVE']
/** `LOCKED` is an authentication lockout, not an account-eligibility signal — deliberately excluded from this rejection list per the task's own explicit instruction not to conflate the two. */
const INELIGIBLE_USER_STATUSES = ['SUSPENDED', 'DEACTIVATED']

export interface AdminEnrollmentDto {
  id: string
  enrollmentCode: string
  studentId: string
  batchId: string
  courseId: string
  status: EnrollmentStatus
  /** Server-derived (Phase 10B Part 2) — see `enrollment-access.service.ts#computeEnrollmentAccessState`. Never re-derive this on the frontend. */
  accessState: EnrollmentAccessState
  source: string
  enrollmentDate: string
  waitlistPosition: number | null
  waitlistedAt: string | null
  confirmedAt: string | null
  activatedAt: string | null
  suspendedAt: string | null
  resumedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  droppedAt: string | null
  accessStartsAt: string | null
  accessEndsAt: string | null
  transferredFromEnrollmentId: string | null
  transferredToEnrollmentId: string | null
  transferReason: string | null
  cancellationReason: string | null
  dropReason: string | null
  internalNotes: string | null
  tags: string[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminEnrollmentListItemDto {
  id: string
  enrollmentCode: string
  status: EnrollmentStatus
  accessState: EnrollmentAccessState
  source: string
  enrollmentDate: string
  waitlistPosition: number | null
  activatedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  student: { id: string; studentCode: string | null; name: string; email: string | null } | null
  batch: { id: string; batchCode: string | null; name: string | null; status: string | null } | null
  course: { id: string; courseCode: string | null; title: string | null } | null
}

export interface EnrollmentBulkResult {
  succeeded: string[]
  waitlisted: string[]
  failed: { id: string; reason: string }[]
}

export function toDto(enrollment: EnrollmentDocument): AdminEnrollmentDto {
  return {
    id: enrollment._id.toString(),
    enrollmentCode: enrollment.enrollmentCode,
    studentId: enrollment.studentId.toString(),
    batchId: enrollment.batchId.toString(),
    courseId: enrollment.courseId.toString(),
    status: enrollment.status,
    accessState: computeEnrollmentAccessState(enrollment),
    source: enrollment.source,
    enrollmentDate: enrollment.enrollmentDate.toISOString(),
    waitlistPosition: enrollment.waitlistPosition,
    waitlistedAt: enrollment.waitlistedAt ? enrollment.waitlistedAt.toISOString() : null,
    confirmedAt: enrollment.confirmedAt ? enrollment.confirmedAt.toISOString() : null,
    activatedAt: enrollment.activatedAt ? enrollment.activatedAt.toISOString() : null,
    suspendedAt: enrollment.suspendedAt ? enrollment.suspendedAt.toISOString() : null,
    resumedAt: enrollment.resumedAt ? enrollment.resumedAt.toISOString() : null,
    completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
    cancelledAt: enrollment.cancelledAt ? enrollment.cancelledAt.toISOString() : null,
    droppedAt: enrollment.droppedAt ? enrollment.droppedAt.toISOString() : null,
    accessStartsAt: enrollment.accessStartsAt ? enrollment.accessStartsAt.toISOString() : null,
    accessEndsAt: enrollment.accessEndsAt ? enrollment.accessEndsAt.toISOString() : null,
    transferredFromEnrollmentId: enrollment.transferredFromEnrollmentId
      ? enrollment.transferredFromEnrollmentId.toString()
      : null,
    transferredToEnrollmentId: enrollment.transferredToEnrollmentId
      ? enrollment.transferredToEnrollmentId.toString()
      : null,
    transferReason: enrollment.transferReason,
    cancellationReason: enrollment.cancellationReason,
    dropReason: enrollment.dropReason,
    internalNotes: enrollment.internalNotes,
    tags: enrollment.tags,
    isDeleted: enrollment.isDeleted,
    createdAt: enrollment.createdAt.toISOString(),
    updatedAt: enrollment.updatedAt.toISOString(),
  }
}

function toListItemDto(row: EnrollmentListRow): AdminEnrollmentListItemDto {
  return {
    id: row._id.toString(),
    enrollmentCode: row.enrollmentCode,
    status: row.status,
    accessState: computeEnrollmentAccessState({
      status: row.status,
      accessStartsAt: row.accessStartsAt,
      accessEndsAt: row.accessEndsAt,
    }),
    source: row.source,
    enrollmentDate: row.enrollmentDate.toISOString(),
    waitlistPosition: row.waitlistPosition,
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.studentFirstName
      ? {
          id: row.studentId.toString(),
          studentCode: row.studentCode,
          name: `${row.studentFirstName} ${row.studentLastName ?? ''}`.trim(),
          email: row.studentEmail,
        }
      : null,
    batch: row.batchCode
      ? {
          id: row.batchId.toString(),
          batchCode: row.batchCode,
          name: row.batchName,
          status: row.batchStatus,
        }
      : null,
    course: row.courseCode
      ? { id: row.courseId.toString(), courseCode: row.courseCode, title: row.courseTitle }
      : null,
  }
}

async function recordAudit(
  action: string,
  entityId: Types.ObjectId | string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
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

/** Existence + eligibility check shared by create/bulk-enroll/transfer — never trusts a client-supplied `courseId`, always resolves it from the batch. */
async function assertStudentEligible(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId)
  if (!student)
    throw ApiError.badRequest('Student not found', [
      { field: 'studentId', message: 'Student not found' },
    ])

  const user = await UserModel.findOne({ _id: student.userId, isDeleted: false })
  if (!user || INELIGIBLE_USER_STATUSES.includes(user.status)) {
    throw ApiError.badRequest('Student account is not eligible for enrollment', [
      { field: 'studentId', message: 'Student account is suspended or deactivated' },
    ])
  }
}

function requireTransition(from: EnrollmentStatus, to: EnrollmentStatus): void {
  if (!canTransitionEnrollment(from, to)) {
    throw ApiError.conflict(`An enrollment cannot move from ${from} to ${to}`)
  }
}

export const enrollmentManagementService = {
  async listEnrollments(
    filter: ListEnrollmentsFilter,
    options: ListEnrollmentsOptions,
  ): Promise<{ dtos: AdminEnrollmentListItemDto[]; total: number }> {
    const { rows, total } = await enrollmentRepository.list(filter, options)
    return { dtos: rows.map(toListItemDto), total }
  },

  async exportEnrollmentsCsv(
    filter: ListEnrollmentsFilter,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const rows = await enrollmentRepository.listAllForExport(filter, MAX_EXPORT_ROWS)

    const columns = [
      'Enrollment Code',
      'Student Code',
      'Student Name',
      'Batch Code',
      'Batch Name',
      'Course Code',
      'Course Title',
      'Status',
      'Source',
      'Enrollment Date',
      'Created At',
    ]
    const csvRows = rows.map((row) => [
      row.enrollmentCode,
      row.studentCode ?? '',
      `${row.studentFirstName ?? ''} ${row.studentLastName ?? ''}`.trim(),
      row.batchCode ?? '',
      row.batchName ?? '',
      row.courseCode ?? '',
      row.courseTitle ?? '',
      row.status,
      row.source,
      row.enrollmentDate.toISOString(),
      row.createdAt.toISOString(),
    ])

    await recordAudit('enrollment.exported', actor.id, actor, context, { count: rows.length })
    return toCsv(columns, csvRows)
  },

  async getEnrollmentById(id: string): Promise<AdminEnrollmentDto> {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    return toDto(enrollment)
  },

  async createEnrollment(
    input: CreateEnrollmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminEnrollmentDto> {
    const batch = await batchRepository.findById(input.batchId)
    if (!batch) {
      throw ApiError.badRequest('Batch not found', [
        { field: 'batchId', message: 'Batch not found' },
      ])
    }
    if (!ENROLLABLE_BATCH_STATUSES.includes(batch.status)) {
      throw ApiError.conflict(`Batches in ${batch.status} status cannot accept new enrollments`)
    }

    await assertStudentEligible(input.studentId)

    const duplicate = await enrollmentRepository.findByStudentAndBatch(
      input.studentId,
      input.batchId,
    )
    if (duplicate) {
      throw ApiError.conflict('This student already has an active enrollment in this batch')
    }
    const courseId = batch.courseId.toString()
    const sameCourse = await enrollmentRepository.findNonTerminalByStudentAndCourse(
      input.studentId,
      courseId,
    )
    if (sameCourse) {
      throw ApiError.conflict(
        'This student already has a non-terminal enrollment in another batch of this course — use transfer instead',
      )
    }

    const enrollmentCode = await generateEnrollmentCode()
    const now = new Date()

    const enrollment = await withTransaction(async (session) => {
      const reservation = await enrollmentCapacityService.reserveSeatOrWaitlist(
        input.batchId,
        batch.waitlistEnabled,
        session,
      )
      if (!reservation.seatReserved && reservation.waitlistPosition === null) {
        throw ApiError.conflict('This batch is full and does not accept a waitlist')
      }

      const status: EnrollmentStatus = reservation.seatReserved ? 'CONFIRMED' : 'WAITLISTED'
      const waitlistPosition = reservation.seatReserved ? null : reservation.waitlistPosition

      return enrollmentRepository.create(
        {
          enrollmentCode,
          studentId: new Types.ObjectId(input.studentId),
          batchId: new Types.ObjectId(input.batchId),
          courseId: batch.courseId,
          status,
          source: 'ADMIN',
          enrollmentDate: input.enrollmentDate ?? now,
          confirmedAt: status === 'CONFIRMED' ? now : null,
          waitlistedAt: status === 'WAITLISTED' ? now : null,
          waitlistPosition,
          internalNotes: input.internalNotes ?? null,
          tags: input.tags,
          createdBy: new Types.ObjectId(actor.id),
          updatedBy: new Types.ObjectId(actor.id),
        },
        session,
      )
    })

    await recordAudit(
      enrollment.status === 'CONFIRMED' ? 'enrollment.created' : 'enrollment.waitlisted',
      enrollment._id,
      actor,
      context,
      { batchId: input.batchId, studentId: input.studentId, status: enrollment.status },
    )

    return toDto(enrollment)
  },

  // ---- Lifecycle ------------------------------------------------------------

  async confirmEnrollment(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    if (enrollment.status !== 'PENDING') {
      throw ApiError.conflict(
        'Only a PENDING enrollment can be confirmed directly — use promote-waitlist for a WAITLISTED one',
      )
    }
    requireTransition(enrollment.status, 'CONFIRMED')

    const updated = await withTransaction(async (session) => {
      const reserved = await enrollmentCapacityService.reserveSeat(
        enrollment.batchId.toString(),
        session,
      )
      if (!reserved) throw ApiError.conflict('No seats are currently available in this batch')
      return enrollmentRepository.updateById(
        id,
        { status: 'CONFIRMED', confirmedAt: new Date(), updatedBy: actor.id },
        session,
      )
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.confirmed', updated._id, actor, context)
    return toDto(updated)
  },

  async promoteWaitlist(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    if (enrollment.status !== 'WAITLISTED') {
      throw ApiError.conflict('Only a WAITLISTED enrollment can be promoted')
    }

    const updated = await withTransaction(async (session) => {
      const reserved = await enrollmentCapacityService.reserveSeat(
        enrollment.batchId.toString(),
        session,
      )
      if (!reserved) throw ApiError.conflict('No seats are currently available in this batch')
      return enrollmentRepository.updateById(
        id,
        { status: 'CONFIRMED', confirmedAt: new Date(), updatedBy: actor.id },
        session,
      )
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.waitlist_promoted', updated._id, actor, context)
    return toDto(updated)
  },

  async activateEnrollment(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'ACTIVE')

    const now = new Date()
    const updated = await enrollmentRepository.updateById(id, {
      status: 'ACTIVE',
      activatedAt: now,
      accessStartsAt: enrollment.accessStartsAt ?? now,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.activated', updated._id, actor, context)
    return toDto(updated)
  },

  async suspendEnrollment(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'SUSPENDED')

    const updated = await enrollmentRepository.updateById(id, {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.suspended', updated._id, actor, context)
    return toDto(updated)
  },

  async resumeEnrollment(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'ACTIVE')

    const updated = await enrollmentRepository.updateById(id, {
      status: 'ACTIVE',
      resumedAt: new Date(),
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.resumed', updated._id, actor, context)
    return toDto(updated)
  },

  async completeEnrollment(id: string, actor: AuthenticatedUser, context: RequestContext) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'COMPLETED')

    const updated = await withTransaction(async (session) => {
      if (doesEnrollmentConsumeSeat(enrollment.status)) {
        await enrollmentCapacityService.releaseSeat(enrollment.batchId.toString(), session)
      }
      return enrollmentRepository.updateById(
        id,
        { status: 'COMPLETED', completedAt: new Date(), updatedBy: actor.id },
        session,
      )
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.completed', updated._id, actor, context)
    return toDto(updated)
  },

  async cancelEnrollment(
    id: string,
    reason: string | undefined,
    actor: AuthenticatedUser,
    context: RequestContext,
  ) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'CANCELLED')

    const now = new Date()
    const updated = await withTransaction(async (session) => {
      if (doesEnrollmentConsumeSeat(enrollment.status)) {
        await enrollmentCapacityService.releaseSeat(enrollment.batchId.toString(), session)
      }
      return enrollmentRepository.updateById(
        id,
        {
          status: 'CANCELLED',
          cancelledAt: now,
          accessEndsAt: now,
          cancellationReason: reason ?? null,
          updatedBy: actor.id,
        },
        session,
      )
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.cancelled', updated._id, actor, context, { reason })
    return toDto(updated)
  },

  async dropEnrollment(
    id: string,
    reason: string | undefined,
    actor: AuthenticatedUser,
    context: RequestContext,
  ) {
    const enrollment = await enrollmentRepository.findById(id)
    if (!enrollment) throw ApiError.notFound('Enrollment not found')
    requireTransition(enrollment.status, 'DROPPED')

    const now = new Date()
    const updated = await withTransaction(async (session) => {
      if (doesEnrollmentConsumeSeat(enrollment.status)) {
        await enrollmentCapacityService.releaseSeat(enrollment.batchId.toString(), session)
      }
      return enrollmentRepository.updateById(
        id,
        {
          status: 'DROPPED',
          droppedAt: now,
          accessEndsAt: now,
          dropReason: reason ?? null,
          updatedBy: actor.id,
        },
        session,
      )
    })
    if (!updated) throw ApiError.notFound('Enrollment not found')

    await recordAudit('enrollment.dropped', updated._id, actor, context, { reason })
    return toDto(updated)
  },

  // ---- Bulk -------------------------------------------------------------

  async bulkEnroll(
    input: BulkEnrollInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<EnrollmentBulkResult> {
    const succeeded: string[] = []
    const waitlisted: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const studentId of input.studentIds) {
      try {
        const dto = await enrollmentManagementService.createEnrollment(
          { studentId, batchId: input.batchId, tags: [] },
          actor,
          context,
        )
        if (dto.status === 'WAITLISTED') waitlisted.push(studentId)
        else succeeded.push(studentId)
      } catch (error) {
        const reason = error instanceof ApiError ? error.message : 'Unexpected error'
        failed.push({ id: studentId, reason })
      }
    }

    await recordAudit('enrollment.bulk_action', actor.id, actor, context, {
      action: 'enroll',
      batchId: input.batchId,
      succeeded,
      waitlisted,
      failed,
    })

    return { succeeded, waitlisted, failed }
  },

  async bulkLifecycleAction(
    action: 'suspend' | 'resume' | 'cancel',
    enrollmentIds: string[],
    reason: string | undefined,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<EnrollmentBulkResult> {
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of enrollmentIds) {
      try {
        if (action === 'suspend')
          await enrollmentManagementService.suspendEnrollment(id, actor, context)
        else if (action === 'resume')
          await enrollmentManagementService.resumeEnrollment(id, actor, context)
        else await enrollmentManagementService.cancelEnrollment(id, reason, actor, context)
        succeeded.push(id)
      } catch (error) {
        const reason2 = error instanceof ApiError ? error.message : 'Unexpected error'
        failed.push({ id, reason: reason2 })
      }
    }

    await recordAudit('enrollment.bulk_action', actor.id, actor, context, {
      action,
      succeeded,
      failed,
    })

    return { succeeded, waitlisted: [], failed }
  },

  async getAuditTimeline(id: string, page: number, limit: number) {
    const { entries, total } = await auditLogRepository.findByEntity('enrollment', id, page, limit)
    return {
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        action: entry.action,
        actorId: entry.actorId ? entry.actorId.toString() : null,
        actorRole: entry.actorRole,
        createdAt: entry.createdAt.toISOString(),
      })),
      total,
    }
  },
}
