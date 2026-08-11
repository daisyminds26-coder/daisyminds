import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const USER_STATUSES = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'DEACTIVATED',
] as const
export type UserStatus = (typeof USER_STATUSES)[number]

/**
 * Base identity record for every human in the system — auth-relevant fields
 * only. Role-specific profile data lives in satellite collections
 * (`students`, `trainers`), keyed by `userId`, per DATABASE.md's
 * "avoid unnecessary references / embed only where appropriate": splitting
 * auth identity from profile data means a student's large profile payload
 * never has to be loaded just to check `role`/`status` on every request.
 *
 * `refreshTokenHash` deliberately does NOT live here — see `user_sessions`,
 * which supports multiple concurrent device sessions with independent
 * revocation, rather than one token per user.
 *
 * Verification/reset token fields are single-active-token-at-a-time (unlike
 * sessions, which are inherently multi-valued) — that's why they're plain
 * nullable fields here rather than their own collection (Phase 2 ADR).
 */
export interface IUser extends AuditFields {
  email: string
  passwordHash: string
  roleId: Types.ObjectId
  status: UserStatus
  mfaEnabled: boolean
  mfaSecret: string | null
  lastLoginAt: Date | null
  lastLoginIp: string | null
  passwordChangedAt: Date | null
  failedLoginAttempts: number
  lockedUntil: Date | null
  emailVerifiedAt: Date | null
  emailVerificationTokenHash: string | null
  emailVerificationTokenExpiresAt: Date | null
  passwordResetTokenHash: string | null
  passwordResetTokenExpiresAt: Date | null
}

export type UserDocument = HydratedDocument<IUser>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: EMAIL_PATTERN,
    maxlength: 254,
  },
  passwordHash: { type: String, required: true, select: false },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  status: { type: String, enum: USER_STATUSES, default: 'PENDING_VERIFICATION' },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null, select: false },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  passwordChangedAt: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0, min: 0 },
  lockedUntil: { type: Date, default: null },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, default: null, select: false },
  emailVerificationTokenExpiresAt: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetTokenExpiresAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(userSchema)

// Partial filter lets a deactivated (soft-deleted) account's email be reused by a new signup.
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
userSchema.index({ roleId: 1, status: 1 })

export const UserModel = model<IUser>('User', userSchema, 'users')
