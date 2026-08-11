import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/**
 * High write volume, short useful life once read — a TTL index on old, read
 * notifications is a strong candidate once a retention period is confirmed
 * (DATABASE.md §5); not added yet since that period is undecided and an
 * arbitrary TTL now would be an undocumented business decision.
 */
export interface INotification extends AuditFields {
  recipientId: Types.ObjectId
  channel: NotificationChannel
  template: string
  payload: Record<string, unknown>
  status: NotificationStatus
  failureReason: string | null
  sentAt: Date | null
  readAt: Date | null
}

export type NotificationDocument = HydratedDocument<INotification>

const notificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
  template: { type: String, required: true, trim: true, maxlength: 100 },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: NOTIFICATION_STATUSES, default: 'QUEUED' },
  failureReason: { type: String, default: null, trim: true, maxlength: 500 },
  sentAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(notificationSchema)

notificationSchema.index({ recipientId: 1, status: 1 })
notificationSchema.index({ recipientId: 1, readAt: 1 })

export const NotificationModel = model<INotification>(
  'Notification',
  notificationSchema,
  'notifications',
)
