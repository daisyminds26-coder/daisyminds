import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * One document per active refresh-token session (SECURITY.md §1) — supports
 * multi-device login with independent per-session revocation, instead of a
 * single token on `users`. `revokedAt` is the meaningful "soft delete" here
 * (an explicit logout/revoke); the TTL index on `expiresAt` hard-deletes
 * naturally-expired sessions, since an expired session has no audit value.
 * `isDeleted`/`deletedAt` exist for schema consistency but are not the
 * primary lifecycle signal for this collection — see DATABASE.md.
 */
export interface IUserSession extends AuditFields {
  userId: Types.ObjectId
  refreshTokenHash: string
  userAgent: string | null
  ipAddress: string | null
  expiresAt: Date
  revokedAt: Date | null
  lastUsedAt: Date | null
}

export type UserSessionDocument = HydratedDocument<IUserSession>

const userSessionSchema = new Schema<IUserSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  refreshTokenHash: { type: String, required: true, select: false },
  userAgent: { type: String, default: null, maxlength: 500 },
  ipAddress: { type: String, default: null, maxlength: 45 },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(userSessionSchema)

userSessionSchema.index({ userId: 1, revokedAt: 1 })
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const UserSessionModel = model<IUserSession>(
  'UserSession',
  userSessionSchema,
  'user_sessions',
)
