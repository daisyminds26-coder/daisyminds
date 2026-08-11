import type { AccountStatus } from '@/features/auth/types'
import type { Role } from '@/shared/types/role'

/** Mirrors `backend/src/services/user-management.service.ts#AdminUserDto` exactly. */
export interface AdminUser {
  id: string
  email: string
  role: Role
  roleId: string
  status: AccountStatus
  mfaEnabled: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  emailVerifiedAt: string | null
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Mirrors `AdminSessionSummary` — no `isCurrent` (this is always someone else's session). */
export interface AdminUserSession {
  id: string
  userAgent: string | null
  ipAddress: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type SortField = 'createdAt' | 'email' | 'lastLoginAt' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface ListUsersParams {
  page: number
  limit: number
  sort?: `${SortField}:${SortDirection}`
  status?: AccountStatus
  roleId?: string
  search?: string
  includeDeleted?: boolean
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type BulkAction = 'activate' | 'deactivate' | 'delete'

export interface BulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

export interface RoleOption {
  id: string
  name: Role
}
