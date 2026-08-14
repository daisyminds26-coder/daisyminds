import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const LIVE_CLASS_STATUSES = ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const
export type LiveClassStatus = (typeof LIVE_CLASS_STATUSES)[number]

export const LIVE_CLASS_DELIVERY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type LiveClassDeliveryMode = (typeof LIVE_CLASS_DELIVERY_MODES)[number]

/**
 * Every value except `MANUAL_LINK`/`OFFLINE`/`OTHER` is schema-forward-
 * compatible only — no real Google Meet/Zoom/Microsoft Teams credentials
 * exist yet (Phase 12 task's own explicit instruction), so
 * `live-meeting-provider.service.ts` treats all of them identically to
 * `MANUAL_LINK` today (an admin-supplied URL). Storing the real enum value
 * now means a future provider integration is a service-layer change, not a
 * migration.
 */
export const LIVE_CLASS_PROVIDERS = [
  'GOOGLE_MEET',
  'ZOOM',
  'MICROSOFT_TEAMS',
  'MANUAL_LINK',
  'OFFLINE',
  'OTHER',
] as const
export type LiveClassProvider = (typeof LIVE_CLASS_PROVIDERS)[number]

export const LIVE_CLASS_SOURCES = ['MANUAL', 'TIMETABLE_GENERATED'] as const
export type LiveClassSource = (typeof LIVE_CLASS_SOURCES)[number]

export const ATTENDANCE_SESSION_STATUSES = ['OPEN', 'FINALIZED'] as const
export type AttendanceSessionStatus = (typeof ATTENDANCE_SESSION_STATUSES)[number]

/** A point-in-time copy of the batch's venue at session creation/generation time — a later edit to the batch's own venue must never retroactively rewrite a past session's location. */
export interface ILiveClassVenue {
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
 * An actual, concrete class-session record — distinct from
 * `batches.weeklySchedule`, which is only a recurring *template*
 * (ARCHITECTURE.md, Phase 12). Sessions are created either manually or
 * projected from the template via `live-class-generation.util.ts`, never
 * auto-created open-endedly.
 */
export interface ILiveClass extends AuditFields {
  sessionCode: string
  batchId: Types.ObjectId
  courseId: Types.ObjectId

  title: string
  description: string | null

  /** Calendar date (UTC midnight) this session falls on — for day-level queries/display, independent of the exact instant. */
  scheduledDate: Date
  startDateTime: Date
  endDateTime: Date
  timezone: string
  durationMinutes: number

  deliveryMode: LiveClassDeliveryMode
  provider: LiveClassProvider
  /** Populated for ONLINE/HYBRID — student-visible once the join window opens. Never a raw provider credential. */
  joinUrl: string | null
  /** Admin/trainer-only — never returned to a student. */
  hostUrl: string | null
  providerMeetingId: string | null
  venue: ILiveClassVenue | null

  trainerIds: Types.ObjectId[]
  primaryTrainerId: Types.ObjectId | null

  status: LiveClassStatus
  source: LiveClassSource

  actualStartedAt: Date | null
  actualEndedAt: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null

  /** Explicit override reason, required only when a session is created outside the batch's date range or on a calendar-exception (holiday/no-class) date — never silently allowed. */
  overrideReason: string | null

  attendanceStatus: AttendanceSessionStatus
  attendanceFinalizedAt: Date | null
  attendanceFinalizedBy: Types.ObjectId | null
}

export type LiveClassDocument = HydratedDocument<ILiveClass>

const venueSchema = new Schema<ILiveClassVenue>(
  {
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

const liveClassSchema = new Schema<ILiveClass>({
  sessionCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 2000 },

  scheduledDate: { type: Date, required: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  timezone: { type: String, required: true, trim: true },
  durationMinutes: { type: Number, required: true, min: 1 },

  deliveryMode: { type: String, enum: LIVE_CLASS_DELIVERY_MODES, required: true },
  provider: { type: String, enum: LIVE_CLASS_PROVIDERS, required: true },
  joinUrl: { type: String, default: null, trim: true, maxlength: 1000 },
  hostUrl: { type: String, default: null, trim: true, maxlength: 1000 },
  providerMeetingId: { type: String, default: null, trim: true, maxlength: 200 },
  venue: { type: venueSchema, default: null },

  trainerIds: { type: [Schema.Types.ObjectId], ref: 'Trainer', default: [] },
  primaryTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },

  status: { type: String, enum: LIVE_CLASS_STATUSES, default: 'DRAFT' },
  source: { type: String, enum: LIVE_CLASS_SOURCES, default: 'MANUAL' },

  actualStartedAt: { type: Date, default: null },
  actualEndedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null, trim: true, maxlength: 500 },

  overrideReason: { type: String, default: null, trim: true, maxlength: 500 },

  attendanceStatus: { type: String, enum: ATTENDANCE_SESSION_STATUSES, default: 'OPEN' },
  attendanceFinalizedAt: { type: Date, default: null },
  attendanceFinalizedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  ...auditFieldsDefinition,
})

applyAuditPlugin(liveClassSchema)

liveClassSchema.index(
  { sessionCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
liveClassSchema.index({ batchId: 1, startDateTime: 1 })
liveClassSchema.index({ courseId: 1, startDateTime: 1 })
liveClassSchema.index({ primaryTrainerId: 1, startDateTime: 1 })
liveClassSchema.index({ trainerIds: 1, startDateTime: 1 })
liveClassSchema.index({ status: 1, startDateTime: 1 })
/**
 * Prevents regenerating the same timetable-projected occurrence twice —
 * scoped to `source: 'TIMETABLE_GENERATED'` only (a partial index), so a
 * manually created session on the same batch/date/time can still coexist
 * (task's own explicit rule: "Manual sessions may coexist if intentionally
 * distinct").
 */
liveClassSchema.index(
  { batchId: 1, scheduledDate: 1, startDateTime: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'TIMETABLE_GENERATED', isDeleted: false },
  },
)

export const LiveClassModel = model<ILiveClass>('LiveClass', liveClassSchema, 'live_classes')
