import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Phase 10A replaces the Phase 1 scaffold entirely (zero real consumers
 * verified before touching it — the only other reference was a doc-comment
 * in `trainer.model.ts`, not code) rather than extending it: the scaffold's
 * `trainerId`/`schedule`/`mode`/`enrolledCount` shape doesn't match this
 * phase's actual requirements (multiple trainers, a real lifecycle state
 * machine, recurring weekly timetable + calendar exceptions, no enrolment
 * concept yet). `enrolledCount` is deliberately **not** carried forward —
 * Phase 10B computes real seat occupancy; this phase must never fake it.
 */
export const BATCH_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

/** Deliberately excludes `SELF_PACED` (unlike `course.model.ts#DELIVERY_MODES`) — a batch is, by definition, a scheduled delivery instance; a self-paced course has no batches at all. */
export const BATCH_DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type BatchDeliveryMode = (typeof BATCH_DELIVERY_MODES)[number]

export const MEETING_PROVIDERS = ['GOOGLE_MEET', 'ZOOM', 'TEAMS', 'OTHER'] as const
export type MeetingProvider = (typeof MEETING_PROVIDERS)[number]

/** Mirrors `trainer.model.ts#DAYS_OF_WEEK` by value, defined locally rather than imported — same module-boundary precedent that file's own `TEACHING_MODES` comment establishes: batches and trainers are separate collections, and coincidental value overlap isn't a reason to couple them. */
export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export const CALENDAR_EXCEPTION_TYPES = [
  'HOLIDAY',
  'NO_CLASS',
  'INSTITUTE_CLOSED',
  'TRAINER_UNAVAILABLE',
  'OTHER',
] as const
export type CalendarExceptionType = (typeof CALENDAR_EXCEPTION_TYPES)[number]

/** Template recurring-timetable metadata only — never generates an actual live-class/session record (deferred to a future phase). */
export interface IWeeklyScheduleSlot {
  dayOfWeek: DayOfWeek
  /** 24h "HH:mm" — a plain time-of-day, deliberately not a `Date`; paired with the batch's own `timezone`, matching `trainer.model.ts#IAvailabilitySlot`'s identical reasoning. */
  startTime: string
  endTime: string
  sessionLabel: string | null
  locationOverride: string | null
  deliveryModeOverride: BatchDeliveryMode | null
}

/** A single no-class date — holiday, trainer leave, etc. Bounded per batch (validator-enforced), so embedding here (not a separate `batch_calendar_exceptions` collection) is the practical Version 1 choice the task itself recommends. */
export interface ICalendarException {
  date: Date
  type: CalendarExceptionType
  title: string
  note: string | null
}

/** Fields are mode-aware but not mode-exclusive at the schema level — an admin building a HYBRID batch genuinely needs both halves populated; validation of "which fields matter for which `deliveryMode`" lives in `batch.validator.ts`/`batch-readiness.service.ts`, not the schema. */
export interface IBatchLocation {
  meetingProvider: MeetingProvider | null
  virtualClassNotes: string | null
  venueName: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  room: string | null
  mapUrl: string | null
}

/**
 * A scheduled delivery instance of a course — "when and how," as distinct
 * from the course's own "what" (ARCHITECTURE.md). `courseId` is immutable
 * after creation (a batch never moves to another course). Capacity is
 * **configuration only** this phase — `maxStudents`/`minimumStudents` are
 * admin-set targets, never a computed/enrolled count; Phase 10B adds real
 * seat-occupancy tracking without touching this shape.
 */
export interface IBatch extends AuditFields {
  batchCode: string
  courseId: Types.ObjectId
  name: string
  shortName: string | null
  description: string

  startDate: Date | null
  endDate: Date | null
  enrollmentOpenDate: Date | null
  enrollmentCloseDate: Date | null
  timezone: string

  deliveryMode: BatchDeliveryMode
  status: BatchStatus

  primaryTrainerId: Types.ObjectId | null
  assistantTrainerIds: Types.ObjectId[]

  maxStudents: number
  minimumStudents: number | null
  waitlistEnabled: boolean

  /**
   * Phase 10B server-managed derived state — never client-writable, never
   * generically PATCH-able. Maintained exclusively by
   * `enrollment-capacity.service.ts` via atomic `$inc` operations inside a
   * transaction alongside the owning enrollment write, using `$expr` to
   * enforce `occupiedSeats < maxStudents` at the database level (prevents
   * oversubscription under concurrent seat requests — see ARCHITECTURE.md
   * §23). Phase 10A deliberately shipped with no such field; this is the
   * correct phase to introduce it now that real enrollment records exist to
   * back the count. `waitlistSequence` is a monotonic per-batch counter for
   * race-safe waitlist positioning — never renumbered, never decremented.
   */
  occupiedSeats: number
  waitlistSequence: number

  location: IBatchLocation

  weeklySchedule: IWeeklyScheduleSlot[]
  calendarExceptions: ICalendarException[]

  tags: string[]
  internalNotes: string | null

  scheduledAt: Date | null
  activatedAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  archivedAt: Date | null
}

export type BatchDocument = HydratedDocument<IBatch>

const weeklyScheduleSlotSchema = new Schema<IWeeklyScheduleSlot>(
  {
    dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    sessionLabel: { type: String, default: null, trim: true, maxlength: 150 },
    locationOverride: { type: String, default: null, trim: true, maxlength: 200 },
    deliveryModeOverride: { type: String, enum: BATCH_DELIVERY_MODES, default: null },
  },
  { _id: false },
)

const calendarExceptionSchema = new Schema<ICalendarException>(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: CALENDAR_EXCEPTION_TYPES, default: 'HOLIDAY' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    note: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { _id: false },
)

const batchLocationSchema = new Schema<IBatchLocation>(
  {
    meetingProvider: { type: String, enum: MEETING_PROVIDERS, default: null },
    virtualClassNotes: { type: String, default: null, trim: true, maxlength: 500 },
    venueName: { type: String, default: null, trim: true, maxlength: 200 },
    addressLine1: { type: String, default: null, trim: true, maxlength: 200 },
    addressLine2: { type: String, default: null, trim: true, maxlength: 200 },
    city: { type: String, default: null, trim: true, maxlength: 100 },
    state: { type: String, default: null, trim: true, maxlength: 100 },
    postalCode: { type: String, default: null, trim: true, maxlength: 20 },
    country: { type: String, default: null, trim: true, maxlength: 100 },
    room: { type: String, default: null, trim: true, maxlength: 100 },
    mapUrl: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { _id: false },
)

const batchSchema = new Schema<IBatch>({
  batchCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  shortName: { type: String, default: null, trim: true, maxlength: 60 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },

  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  enrollmentOpenDate: { type: Date, default: null },
  enrollmentCloseDate: { type: Date, default: null },
  timezone: { type: String, required: true, maxlength: 60 },

  deliveryMode: { type: String, enum: BATCH_DELIVERY_MODES, required: true },
  status: { type: String, enum: BATCH_STATUSES, default: 'DRAFT' },

  primaryTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
  assistantTrainerIds: { type: [Schema.Types.ObjectId], ref: 'Trainer', default: [] },

  maxStudents: { type: Number, required: true, min: 1, max: 10_000 },
  minimumStudents: { type: Number, default: null, min: 0 },
  waitlistEnabled: { type: Boolean, default: false },
  occupiedSeats: { type: Number, default: 0, min: 0 },
  waitlistSequence: { type: Number, default: 0, min: 0 },

  location: { type: batchLocationSchema, default: () => ({}) },

  weeklySchedule: { type: [weeklyScheduleSlotSchema], default: [] },
  calendarExceptions: { type: [calendarExceptionSchema], default: [] },

  tags: { type: [String], default: [] },
  internalNotes: { type: String, default: null, trim: true, maxlength: 2000 },

  scheduledAt: { type: Date, default: null },
  activatedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },

  ...auditFieldsDefinition,
})

applyAuditPlugin(batchSchema)

batchSchema.index({ batchCode: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
batchSchema.index({ courseId: 1, status: 1 })
batchSchema.index({ primaryTrainerId: 1, status: 1 })
batchSchema.index({ startDate: 1, endDate: 1 })
batchSchema.index({ status: 1, startDate: 1 })
batchSchema.index({ isDeleted: 1, status: 1 })
batchSchema.index({ tags: 1 })
batchSchema.index({ name: 'text', batchCode: 'text' })

export const BatchModel = model<IBatch>('Batch', batchSchema, 'batches')
