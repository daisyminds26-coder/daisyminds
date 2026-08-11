import type { Role } from '@/shared/types/role'

export const USER_STATUSES = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'DEACTIVATED',
] as const
export type AccountStatus = (typeof USER_STATUSES)[number]

/** Exactly what `GET /auth/me` returns (backend/src/services/auth.service.ts#getCurrentUser) — never a field more. */
export interface AuthUser {
  id: string
  email: string
  role: Role
  status: AccountStatus
  emailVerifiedAt: string | null
  mfaEnabled: boolean
  lastLoginAt: string | null
  permissions: string[]
}

/** `POST /auth/login`'s `user` payload — a strict subset of AuthUser, no `permissions` (backend/src/services/auth.service.ts#toPublicUser). */
export interface PublicUser {
  id: string
  email: string
  role: Role
  status: AccountStatus
  emailVerifiedAt: string | null
  mfaEnabled: boolean
  lastLoginAt: string | null
}

export interface LoginResponseData {
  accessToken: string
  user: PublicUser
}

export interface RefreshResponseData {
  accessToken: string
}

export interface SessionSummary {
  id: string
  userAgent: string | null
  ipAddress: string | null
  lastUsedAt: string | null
  createdAt: string
  isCurrent: boolean
}
