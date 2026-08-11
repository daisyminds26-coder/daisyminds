import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const LIVE_CLASS_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const
export type LiveClassStatus = (typeof LIVE_CLASS_STATUSES)[number]

/**
 * `providerSessionId`/`joinUrl` are opaque values from whichever managed
 * video-conferencing vendor is selected (ARCHITECTURE.md §9, pending) — this
 * schema intentionally has no vendor-specific fields, so swapping providers
 * later is a service-layer change, not a migration.
 */
export interface ILiveClass extends AuditFields {
  batchId: Types.ObjectId
  title: string
  scheduledStart: Date
  scheduledEnd: Date
  providerSessionId: string | null
  joinUrl: string | null
  recordingUrl: string | null
  status: LiveClassStatus
}

export type LiveClassDocument = HydratedDocument<ILiveClass>

const liveClassSchema = new Schema<ILiveClass>({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  providerSessionId: { type: String, default: null },
  joinUrl: { type: String, default: null },
  recordingUrl: { type: String, default: null },
  status: { type: String, enum: LIVE_CLASS_STATUSES, default: 'SCHEDULED' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(liveClassSchema)

liveClassSchema.index({ batchId: 1, scheduledStart: 1 })
liveClassSchema.index({ status: 1, scheduledStart: 1 })

export const LiveClassModel = model<ILiveClass>('LiveClass', liveClassSchema, 'live_classes')
