import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { minutesFromNow } from '../utils/duration'
import { toCsv } from '../utils/csv'
import { env } from '../config/env'
import { enqueueAuthEmail } from '../queues/auth-email.queue'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { roleRepository } from '../repositories/role.repository'
import {
  userRepository,
  type ListUsersFilter,
  type ListUsersOptions,
} from '../repositories/user.repository'
import { userSessionRepository } from '../repositories/user-session.repository'
import { hashPassword } from './password.service'
import { generateOpaqueTokenPair } from './token.service'
import type { RoleDocument } from '../models/role.model'
import type { UserDocument, UserStatus } from '../models/user.model'
import type {
  BulkAction,
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from '../validators/user.validator'
import type { AuthenticatedUser } from '../types/auth'

const SUPER_ADMIN = 'SUPER_ADMIN'

export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
}

export interface AdminUserDto {
  id: string
  email: string
  role: string
  roleId: string
  status: UserStatus
  mfaEnabled: boolean
  lastLoginAt: Date | null
  lastLoginIp: string | null
  emailVerifiedAt: Date | null
  isDeleted: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLogEntryDto {
  id: string
  actorId: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface AdminSessionSummary {
  id: string
  userAgent: string | null
  ipAddress: string | null
  lastUsedAt: Date | null
  createdAt: Date
}

export interface BulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

async function resolveRoleNames(users: UserDocument[]): Promise<Map<string, RoleDocument>> {
  const roleIds = [...new Set(users.map((user) => user.roleId.toString()))]
  const roles = await Promise.all(roleIds.map((id) => roleRepository.findById(id)))
  const map = new Map<string, RoleDocument>()
  roles.forEach((role, index) => {
    const roleId = roleIds[index]
    if (role && roleId) {
      map.set(roleId, role)
    }
  })
  return map
}

function toDto(user: UserDocument, roleName: string): AdminUserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    role: roleName,
    roleId: user.roleId.toString(),
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    emailVerifiedAt: user.emailVerifiedAt,
    isDeleted: user.isDeleted,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function toDtoSingle(user: UserDocument): Promise<AdminUserDto> {
  const role = await roleRepository.findById(user.roleId.toString())
  if (!role) {
    throw ApiError.internal('User role could not be resolved')
  }
  return toDto(user, role.name)
}

async function loadUserAndRole(
  userId: string,
): Promise<{ user: UserDocument; role: RoleDocument }> {
  const user = await userRepository.findById(userId)
  if (!user) {
    throw ApiError.notFound('User not found')
  }
  const role = await roleRepository.findById(user.roleId.toString())
  if (!role) {
    throw ApiError.internal('User role could not be resolved')
  }
  return { user, role }
}

/** SECURITY.md: "SUPER_ADMIN cannot delete themselves" — generalized to every destructive/status-changing self-action in this module to prevent accidental self-lockout. */
function assertNotSelf(actor: AuthenticatedUser, targetUserId: string, action: string): void {
  if (actor.id === targetUserId) {
    throw ApiError.unprocessable(`You cannot ${action} your own account.`)
  }
}

/** Prevents an ADMIN from touching a SUPER_ADMIN account at all — only a SUPER_ADMIN may modify another SUPER_ADMIN. */
function assertCanActOnTarget(actor: AuthenticatedUser, targetRoleName: string): void {
  if (targetRoleName === SUPER_ADMIN && actor.role !== SUPER_ADMIN) {
    throw ApiError.forbidden('Only a SUPER_ADMIN can modify a SUPER_ADMIN account.')
  }
}

/** Prevents an ADMIN from granting SUPER_ADMIN to anyone (including themselves) — the core privilege-escalation guard. */
function assertRoleGrantAllowed(actor: AuthenticatedUser, newRoleName: string): void {
  if (newRoleName === SUPER_ADMIN && actor.role !== SUPER_ADMIN) {
    throw ApiError.forbidden('Only a SUPER_ADMIN can grant the SUPER_ADMIN role.')
  }
}

export const userManagementService = {
  async listUsers(query: ListUsersQuery): Promise<{ dtos: AdminUserDto[]; total: number }> {
    const filter: ListUsersFilter = {
      status: query.status,
      roleId: query.roleId,
      search: query.search,
      includeDeleted: query.includeDeleted,
    }
    const options: ListUsersOptions = {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    }

    const { users, total } = await userRepository.list(filter, options)
    const roleMap = await resolveRoleNames(users)
    const dtos = users.map((user) =>
      toDto(user, roleMap.get(user.roleId.toString())?.name ?? 'UNKNOWN'),
    )

    return { dtos, total }
  },

  async getUserById(userId: string): Promise<AdminUserDto> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    return toDtoSingle(user)
  },

  async createUser(
    input: CreateUserInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const role = await roleRepository.findById(input.roleId)
    if (!role) {
      throw ApiError.badRequest('Role not found')
    }
    assertRoleGrantAllowed(actor, role.name)

    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw ApiError.conflict('A user with this email already exists')
    }

    const now = new Date()
    const user = await userRepository.create({
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      roleId: role._id,
      status: input.sendVerificationEmail ? 'PENDING_VERIFICATION' : 'ACTIVE',
      emailVerifiedAt: input.sendVerificationEmail ? null : now,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    if (input.sendVerificationEmail) {
      const { raw, hash } = generateOpaqueTokenPair()
      await userRepository.updateById(user._id.toString(), {
        emailVerificationTokenHash: hash,
        emailVerificationTokenExpiresAt: minutesFromNow(env.EMAIL_VERIFICATION_TOKEN_TTL_MIN),
      })
      await enqueueAuthEmail('email-verification', {
        email: user.email,
        link: `${env.FRONTEND_URL}/verify-email?token=${raw}`,
      })
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.created',
      entityType: 'user',
      entityId: user._id,
      metadata: { email: user.email, role: role.name },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(user, role.name)
  },

  async updateUser(
    userId: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const { user, role } = await loadUserAndRole(userId)

    const newEmail = input.email.toLowerCase()
    if (newEmail !== user.email) {
      const existing = await userRepository.findByEmail(newEmail)
      if (existing) {
        throw ApiError.conflict('A user with this email already exists')
      }
    }

    const previousEmail = user.email
    const updated = await userRepository.updateById(userId, {
      email: newEmail,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('User not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.updated',
      entityType: 'user',
      entityId: updated._id,
      metadata: { previousEmail, newEmail },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, role.name)
  },

  async deactivateUser(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    assertNotSelf(actor, userId, 'deactivate')
    const { role } = await loadUserAndRole(userId)
    assertCanActOnTarget(actor, role.name)
    if (role.name === SUPER_ADMIN) {
      const remaining = await userRepository.countActiveByRole(role._id.toString(), userId)
      if (remaining === 0) {
        throw ApiError.unprocessable('Cannot deactivate the last active SUPER_ADMIN.')
      }
    }

    const updated = await userRepository.updateById(userId, {
      status: 'DEACTIVATED',
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('User not found')
    }
    await userSessionRepository.revokeAllForUser(userId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.deactivated',
      entityType: 'user',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, role.name)
  },

  async activateUser(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const { role } = await loadUserAndRole(userId)
    assertCanActOnTarget(actor, role.name)

    const updated = await userRepository.updateById(userId, {
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('User not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.activated',
      entityType: 'user',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, role.name)
  },

  async softDeleteUser(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    assertNotSelf(actor, userId, 'delete')
    const { user, role } = await loadUserAndRole(userId)
    assertCanActOnTarget(actor, role.name)
    if (role.name === SUPER_ADMIN && user.status === 'ACTIVE') {
      const remaining = await userRepository.countActiveByRole(role._id.toString(), userId)
      if (remaining === 0) {
        throw ApiError.unprocessable('Cannot delete the last active SUPER_ADMIN.')
      }
    }

    await userRepository.softDeleteById(userId, actor.id)
    await userSessionRepository.revokeAllForUser(userId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.soft_deleted',
      entityType: 'user',
      entityId: user._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async restoreUser(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const user = await userRepository.findByIdIncludingDeleted(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    if (!user.isDeleted) {
      throw ApiError.unprocessable('This user is not deleted.')
    }

    const role = await roleRepository.findById(user.roleId.toString())
    if (!role) {
      throw ApiError.internal('User role could not be resolved')
    }

    const restored = await userRepository.restoreById(userId, actor.id)
    if (!restored) {
      throw ApiError.notFound('User not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.restored',
      entityType: 'user',
      entityId: restored._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(restored, role.name)
  },

  async assignRole(
    userId: string,
    newRoleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const { user, role: currentRole } = await loadUserAndRole(userId)
    const newRole = await roleRepository.findById(newRoleId)
    if (!newRole) {
      throw ApiError.badRequest('Role not found')
    }

    assertRoleGrantAllowed(actor, newRole.name)
    assertCanActOnTarget(actor, currentRole.name)

    if (currentRole.name === SUPER_ADMIN && newRole.name !== SUPER_ADMIN) {
      const remaining = await userRepository.countActiveByRole(currentRole._id.toString(), userId)
      if (remaining === 0) {
        throw ApiError.unprocessable('Cannot change the role of the last active SUPER_ADMIN.')
      }
    }

    const updated = await userRepository.updateById(userId, {
      roleId: newRole._id,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('User not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.role_assigned',
      entityType: 'user',
      entityId: user._id,
      metadata: { previousRole: currentRole.name, newRole: newRole.name },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, newRole.name)
  },

  async triggerPasswordReset(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const { raw, hash } = generateOpaqueTokenPair()
    await userRepository.updateById(userId, {
      passwordResetTokenHash: hash,
      passwordResetTokenExpiresAt: minutesFromNow(env.PASSWORD_RESET_TOKEN_TTL_MIN),
    })
    await enqueueAuthEmail('password-reset', {
      email: user.email,
      link: `${env.FRONTEND_URL}/reset-password?token=${raw}`,
    })

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.password_reset_triggered',
      entityType: 'user',
      entityId: user._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async resendVerification(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    if (user.status !== 'PENDING_VERIFICATION') {
      throw ApiError.unprocessable('This account is already verified.')
    }

    const { raw, hash } = generateOpaqueTokenPair()
    await userRepository.updateById(userId, {
      emailVerificationTokenHash: hash,
      emailVerificationTokenExpiresAt: minutesFromNow(env.EMAIL_VERIFICATION_TOKEN_TTL_MIN),
    })
    await enqueueAuthEmail('email-verification', {
      email: user.email,
      link: `${env.FRONTEND_URL}/verify-email?token=${raw}`,
    })

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.verification_resent',
      entityType: 'user',
      entityId: user._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async listSessions(userId: string): Promise<AdminSessionSummary[]> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    const sessions = await userSessionRepository.findActiveByUserId(userId)
    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
    }))
  },

  async forceLogoutSession(
    userId: string,
    sessionId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const session = await userSessionRepository.findActiveById(sessionId)
    if (session?.userId.toString() !== userId) {
      throw ApiError.notFound('Session not found')
    }

    await userSessionRepository.revokeById(sessionId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.session.force_revoked',
      entityType: 'user_session',
      entityId: session._id,
      metadata: { targetUserId: userId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async forceLogoutAll(
    userId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    await userSessionRepository.revokeAllForUser(userId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.logout_all_forced',
      entityType: 'user',
      entityId: user._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async bulkAction(
    action: BulkAction,
    userIds: string[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = { succeeded: [], failed: [] }

    for (const id of userIds) {
      try {
        if (action === 'activate') {
          await userManagementService.activateUser(id, actor, context)
        } else if (action === 'deactivate') {
          await userManagementService.deactivateUser(id, actor, context)
        } else {
          await userManagementService.softDeleteUser(id, actor, context)
        }
        result.succeeded.push(id)
      } catch (error) {
        result.failed.push({
          id,
          reason: error instanceof ApiError ? error.message : 'Unexpected error',
        })
      }
    }

    return result
  },

  async exportUsersCsv(filter: ListUsersFilter): Promise<string> {
    const users = await userRepository.listAll(filter)
    const roleMap = await resolveRoleNames(users)

    const columns = [
      'id',
      'email',
      'role',
      'status',
      'emailVerifiedAt',
      'lastLoginAt',
      'isDeleted',
      'createdAt',
    ] as const

    const rows = users.map((user) => [
      user._id.toString(),
      user.email,
      roleMap.get(user.roleId.toString())?.name ?? 'UNKNOWN',
      user.status,
      user.emailVerifiedAt?.toISOString() ?? '',
      user.lastLoginAt?.toISOString() ?? '',
      String(user.isDeleted),
      user.createdAt.toISOString(),
    ])

    return toCsv(columns, rows)
  },

  async getAuditTimeline(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ entries: AuditLogEntryDto[]; total: number }> {
    const { entries, total } = await auditLogRepository.findByEntity('user', userId, page, limit)
    return {
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        actorId: entry.actorId ? entry.actorId.toString() : null,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId.toString(),
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt,
      })),
      total,
    }
  },
}
