import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Append-only trail of every state-changing action (SECURITY.md §8).
 * `actorId` is nullable for system-initiated entries (e.g. a scheduled job
 * auto-expiring a batch) — `actorRole` is captured at write time (not
 * populated from the live `users`/`roles` relationship) because a user's
 * role can change later and the historical record must reflect what they
 * were *when they acted*. Updates are blocked at the schema level below —
 * "an audit trail that can be edited is not an audit trail."
 */
export interface IAuditLog extends AuditFields {
  actorId: Types.ObjectId | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: Types.ObjectId
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
}

export type AuditLogDocument = HydratedDocument<IAuditLog>

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: null, maxlength: 60 },
  action: { type: String, required: true, trim: true, maxlength: 120 },
  entityType: { type: String, required: true, trim: true, maxlength: 60 },
  entityId: { type: Schema.Types.ObjectId, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null, maxlength: 45 },
  userAgent: { type: String, default: null, maxlength: 500 },
  ...auditFieldsDefinition,
})

applyAuditPlugin(auditLogSchema)

auditLogSchema.index({ entityType: 1, entityId: 1 })
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })

function rejectUpdate(): never {
  throw new Error('Audit logs are append-only and cannot be updated')
}

auditLogSchema.pre('updateOne', rejectUpdate)
auditLogSchema.pre('updateMany', rejectUpdate)
auditLogSchema.pre('findOneAndUpdate', rejectUpdate)

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema, 'audit_logs')
