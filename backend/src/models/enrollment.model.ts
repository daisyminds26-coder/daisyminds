import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Phase 10B replaces the Phase 1 scaffold entirely (zero real consumers
 * verified before touching it) — the old 4-state `PENDING_PAYMENT`/`ACTIVE`/
 * `COMPLETED`/`WITHDRAWN` shape has no seat/capacity concept, no waitlist,
 * no transfer lineage, and no access-window entitlement, none of which can
 * be bolted on without a status-enum change anyway. See ARCHITECTURE.md §23.
 */
export const ENROLLMENT_STATUSES = [
  'PENDING',
  'WAITLISTED',
  'CONFIRMED',
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
  'DROPPED',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

/** `SELF_SERVICE`/`API` are reserved, unwritten by any endpoint this phase (no student self-enrollment or public API exists yet) — same "reserved enum value" precedent as `users.mfaEnabled`. */
export const ENROLLMENT_SOURCES = [
  'ADMIN',
  'BULK_IMPORT',
  'TRANSFER',
  'SELF_SERVICE',
  'API',
] as const
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number]

/**
 * A student's membership in one batch — the authorization bridge between
 * student identity and learning access (ARCHITECTURE.md §23). `courseId` is
 * always server-derived from the batch, never trusted from a client.
 *
 * `accessStartsAt`/`accessEndsAt` are a deliberate consolidation of the
 * task's originally-separate `accessGrantedAt`/`accessRevokedAt` pair into a
 * single window — see ARCHITECTURE.md §23 for the full reasoning: the PRD
 * does not resolve whether course access ends when a batch does or persists
 * afterward (a common coaching-center "lifetime recording access" offer),
 * so a nullable end date is the future-safe choice — `null` means "open,"
 * never client-settable.
 */
export interface IEnrollment extends AuditFields {
  enrollmentCode: string
  studentId: Types.ObjectId
  batchId: Types.ObjectId
  courseId: Types.ObjectId

  status: EnrollmentStatus
  source: EnrollmentSource

  enrollmentDate: Date

  waitlistPosition: number | null
  waitlistedAt: Date | null
  confirmedAt: Date | null
  activatedAt: Date | null
  suspendedAt: Date | null
  resumedAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  droppedAt: Date | null

  accessStartsAt: Date | null
  accessEndsAt: Date | null

  transferredFromEnrollmentId: Types.ObjectId | null
  transferredToEnrollmentId: Types.ObjectId | null
  transferReason: string | null

  cancellationReason: string | null
  dropReason: string | null

  internalNotes: string | null
  tags: string[]
}

export type EnrollmentDocument = HydratedDocument<IEnrollment>

const enrollmentSchema = new Schema<IEnrollment>({
  enrollmentCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

  status: { type: String, enum: ENROLLMENT_STATUSES, default: 'PENDING' },
  source: { type: String, enum: ENROLLMENT_SOURCES, default: 'ADMIN' },

  enrollmentDate: { type: Date, default: Date.now },

  waitlistPosition: { type: Number, default: null, min: 0 },
  waitlistedAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
  activatedAt: { type: Date, default: null },
  suspendedAt: { type: Date, default: null },
  resumedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  droppedAt: { type: Date, default: null },

  accessStartsAt: { type: Date, default: null },
  accessEndsAt: { type: Date, default: null },

  transferredFromEnrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
  transferredToEnrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
  transferReason: { type: String, default: null, trim: true, maxlength: 500 },

  cancellationReason: { type: String, default: null, trim: true, maxlength: 500 },
  dropReason: { type: String, default: null, trim: true, maxlength: 500 },

  internalNotes: { type: String, default: null, trim: true, maxlength: 2000 },
  tags: { type: [String], default: [] },

  ...auditFieldsDefinition,
})

applyAuditPlugin(enrollmentSchema)

enrollmentSchema.index(
  { enrollmentCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
/**
 * At most one *live* (non-deleted) enrollment row per student+batch — the
 * lifecycle status itself carries history (terminal states are never
 * deleted to make room for a new row), so this index is a hard integrity
 * backstop, not the primary duplicate-prevention mechanism (that's the
 * service-layer check in `enrollment-management.service.ts`, which can
 * evaluate the richer "non-terminal" business rule a plain unique index
 * can't express).
 */
enrollmentSchema.index(
  { studentId: 1, batchId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
enrollmentSchema.index({ batchId: 1, status: 1 })
enrollmentSchema.index({ studentId: 1, status: 1 })
enrollmentSchema.index({ studentId: 1, courseId: 1, status: 1 })
enrollmentSchema.index({ courseId: 1, status: 1 })
enrollmentSchema.index({ createdAt: 1 })
enrollmentSchema.index({ batchId: 1, waitlistedAt: 1, waitlistPosition: 1 })

export const EnrollmentModel = model<IEnrollment>('Enrollment', enrollmentSchema, 'enrollments')
