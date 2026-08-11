import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { minutesFromNow, parseDurationToMs } from '../utils/duration'
import { env } from '../config/env'
import { enqueueAuthEmail } from '../queues/auth-email.queue'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { roleRepository } from '../repositories/role.repository'
import { userRepository } from '../repositories/user.repository'
import { userSessionRepository } from '../repositories/user-session.repository'
import { hashPassword, verifyPassword } from './password.service'
import {
  buildRefreshCookieValue,
  generateOpaqueTokenPair,
  hashOpaqueToken,
  parseRefreshCookieValue,
  signAccessToken,
} from './token.service'
import type { UserDocument } from '../models/user.model'
import type { AuthenticatedUser } from '../types/auth'

export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
}

export interface PublicUser {
  id: string
  email: string
  role: string
  status: string
  emailVerifiedAt: Date | null
  mfaEnabled: boolean
  lastLoginAt: Date | null
}

export interface AuthTokens {
  accessToken: string
  cookieValue: string
  cookieExpiresAt: Date
}

export interface SessionSummary {
  id: string
  userAgent: string | null
  ipAddress: string | null
  lastUsedAt: Date | null
  createdAt: Date
  isCurrent: boolean
}

function toPublicUser(user: UserDocument, roleName: string): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: roleName,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt,
  }
}

async function loadAuthenticatedUser(
  user: UserDocument,
  sessionId: string,
): Promise<AuthenticatedUser> {
  const role = await roleRepository.findById(user.roleId.toString())
  if (!role) {
    throw ApiError.internal('User role could not be resolved')
  }

  return {
    id: user._id.toString(),
    roleId: role._id.toString(),
    role: role.name,
    permissions: role.permissions,
    sessionId,
  }
}

async function issueSession(
  userId: string,
  context: RequestContext,
): Promise<{ sessionId: string; rawToken: string; expiresAt: Date }> {
  const { raw, hash } = generateOpaqueTokenPair()
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))

  const session = await userSessionRepository.create({
    userId: new Types.ObjectId(userId),
    refreshTokenHash: hash,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt,
  })

  return { sessionId: session._id.toString(), rawToken: raw, expiresAt }
}

export const authService = {
  /**
   * Ordering is deliberate: lockout is checked before the (expensive)
   * password verification (no point paying Argon2's cost for an account we
   * already know to reject), but account-status disclosure (unverified,
   * suspended) happens only AFTER a correct password is proven — revealing
   * that state to someone who doesn't already know the password would be a
   * user-enumeration leak. A deactivated account never reveals its state at
   * all, even with a correct password, and returns the same generic error
   * as "no such user."
   */
  async login(
    email: string,
    password: string,
    context: RequestContext,
  ): Promise<AuthTokens & { user: PublicUser }> {
    const user = await userRepository.findByEmailWithPassword(email)

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    if (user.status === 'LOCKED' && user.lockedUntil && user.lockedUntil > new Date()) {
      throw ApiError.locked(
        'This account is temporarily locked due to repeated failed login attempts. Please try again later.',
        user.lockedUntil,
      )
    }

    if (user.status === 'LOCKED' && user.lockedUntil && user.lockedUntil <= new Date()) {
      user.status = 'ACTIVE'
      user.lockedUntil = null
      user.failedLoginAttempts = 0
    }

    const passwordMatches = await verifyPassword(user.passwordHash, password)

    if (!passwordMatches) {
      user.failedLoginAttempts += 1

      if (user.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) {
        user.status = 'LOCKED'
        user.lockedUntil = minutesFromNow(env.LOGIN_LOCKOUT_MIN)
      }

      await user.save()
      await auditLogRepository.record({
        actorId: user._id.toString(),
        actorRole: null,
        action: 'auth.login.failed',
        entityType: 'user',
        entityId: user._id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw ApiError.unauthorized('Invalid email or password')
    }

    if (user.status === 'DEACTIVATED') {
      throw ApiError.unauthorized('Invalid email or password')
    }

    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('This account has been suspended. Please contact support.')
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new ApiError(
        'Please verify your email address before logging in.',
        403,
        'EMAIL_NOT_VERIFIED',
      )
    }

    user.failedLoginAttempts = 0
    user.lastLoginAt = new Date()
    user.lastLoginIp = context.ipAddress
    await user.save()

    const { sessionId, rawToken, expiresAt } = await issueSession(user._id.toString(), context)
    const authenticatedUser = await loadAuthenticatedUser(user, sessionId)
    const accessToken = signAccessToken(authenticatedUser)

    await auditLogRepository.record({
      actorId: user._id.toString(),
      actorRole: authenticatedUser.role,
      action: 'auth.login.success',
      entityType: 'user',
      entityId: user._id,
      metadata: { sessionId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      accessToken,
      cookieValue: buildRefreshCookieValue(sessionId, rawToken),
      cookieExpiresAt: expiresAt,
      user: toPublicUser(user, authenticatedUser.role),
    }
  },

  /**
   * Rotating refresh with reuse detection (SECURITY.md §1): rotation always
   * replaces the stored hash, so a presented token that doesn't match means
   * an already-rotated (stale) token was replayed — a compromise signal,
   * not just an expired-token case. The session is revoked immediately.
   */
  async refresh(cookieValue: string, context: RequestContext): Promise<AuthTokens> {
    const parsed = parseRefreshCookieValue(cookieValue)
    if (!parsed) {
      throw ApiError.unauthorized('Invalid session')
    }

    const session = await userSessionRepository.findActiveById(parsed.sessionId)
    if (!session) {
      throw ApiError.unauthorized('Invalid session')
    }

    if (session.expiresAt <= new Date()) {
      await userSessionRepository.revokeById(parsed.sessionId)
      throw ApiError.unauthorized('Session expired, please log in again')
    }

    const presentedHash = hashOpaqueToken(parsed.rawToken)
    if (presentedHash !== session.refreshTokenHash) {
      await userSessionRepository.revokeById(parsed.sessionId)
      await auditLogRepository.record({
        actorId: session.userId.toString(),
        actorRole: null,
        action: 'auth.refresh.reuse_detected',
        entityType: 'user_session',
        entityId: session._id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      throw ApiError.unauthorized('Session invalid, please log in again')
    }

    const user = await userRepository.findById(session.userId.toString())
    if (!user || user.status === 'DEACTIVATED' || user.status === 'SUSPENDED') {
      await userSessionRepository.revokeById(parsed.sessionId)
      throw ApiError.unauthorized('Invalid session')
    }

    const { raw: newRawToken, hash: newHash } = generateOpaqueTokenPair()
    const newExpiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))
    await userSessionRepository.rotate(parsed.sessionId, newHash, newExpiresAt)

    const authenticatedUser = await loadAuthenticatedUser(user, parsed.sessionId)
    const accessToken = signAccessToken(authenticatedUser)

    return {
      accessToken,
      cookieValue: buildRefreshCookieValue(parsed.sessionId, newRawToken),
      cookieExpiresAt: newExpiresAt,
    }
  },

  async logout(sessionId: string, actorId: string): Promise<void> {
    await userSessionRepository.revokeById(sessionId)
    await auditLogRepository.record({
      actorId,
      actorRole: null,
      action: 'auth.logout',
      entityType: 'user_session',
      entityId: sessionId,
    })
  },

  async logoutAll(userId: string): Promise<void> {
    await userSessionRepository.revokeAllForUser(userId)
    await auditLogRepository.record({
      actorId: userId,
      actorRole: null,
      action: 'auth.logout_all',
      entityType: 'user',
      entityId: userId,
    })
  },

  async getCurrentUser(userId: string): Promise<PublicUser & { permissions: string[] }> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const role = await roleRepository.findById(user.roleId.toString())
    if (!role) {
      throw ApiError.internal('User role could not be resolved')
    }

    return { ...toPublicUser(user, role.name), permissions: role.permissions }
  },

  async listSessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
    const sessions = await userSessionRepository.findActiveByUserId(userId)

    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      isCurrent: session._id.toString() === currentSessionId,
    }))
  },

  /**
   * `DELETE /sessions/:id` — distinct from `logout()`: the caller is
   * revoking a (possibly different-device) session by ID, not necessarily
   * ending their own current session, so it gets its own audit action name.
   * Ownership is already verified by `ownership.middleware.ts` before this
   * is called.
   */
  async revokeSessionById(sessionId: string, actorId: string): Promise<void> {
    await userSessionRepository.revokeById(sessionId)
    await auditLogRepository.record({
      actorId,
      actorRole: null,
      action: 'auth.session.revoked',
      entityType: 'user_session',
      entityId: sessionId,
    })
  },

  async forgotPassword(email: string, context: RequestContext): Promise<void> {
    const user = await userRepository.findByEmail(email)

    if (user && user.status !== 'DEACTIVATED') {
      const { raw, hash } = generateOpaqueTokenPair()
      user.passwordResetTokenHash = hash
      user.passwordResetTokenExpiresAt = minutesFromNow(env.PASSWORD_RESET_TOKEN_TTL_MIN)
      await user.save()

      await enqueueAuthEmail('password-reset', {
        email: user.email,
        link: `${env.FRONTEND_URL}/reset-password?token=${raw}`,
      })

      await auditLogRepository.record({
        actorId: user._id.toString(),
        actorRole: null,
        action: 'auth.password.forgot_requested',
        entityType: 'user',
        entityId: user._id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }
    // Always returns void regardless of whether the email exists — the
    // controller sends an identical generic response either way.
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = hashOpaqueToken(rawToken)
    const user = await userRepository.findByPasswordResetTokenHash(hash)

    if (!user?.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt <= new Date()) {
      throw ApiError.badRequest('Invalid or expired reset token')
    }

    user.passwordHash = await hashPassword(newPassword)
    user.passwordResetTokenHash = null
    user.passwordResetTokenExpiresAt = null
    user.passwordChangedAt = new Date()
    user.failedLoginAttempts = 0
    if (user.status === 'LOCKED') {
      user.status = 'ACTIVE'
      user.lockedUntil = null
    }
    await user.save()

    await userSessionRepository.revokeAllForUser(user._id.toString())
    await auditLogRepository.record({
      actorId: user._id.toString(),
      actorRole: null,
      action: 'auth.password.reset_completed',
      entityType: 'user',
      entityId: user._id,
    })
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
  ): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const matches = await verifyPassword(user.passwordHash, currentPassword)
    if (!matches) {
      throw ApiError.unauthorized('Current password is incorrect')
    }

    user.passwordHash = await hashPassword(newPassword)
    user.passwordChangedAt = new Date()
    await user.save()

    await userSessionRepository.revokeAllForUser(userId, currentSessionId)
    await auditLogRepository.record({
      actorId: userId,
      actorRole: null,
      action: 'auth.password.changed',
      entityType: 'user',
      entityId: userId,
    })
  },

  async verifyEmail(rawToken: string): Promise<void> {
    const hash = hashOpaqueToken(rawToken)
    const user = await userRepository.findByEmailVerificationTokenHash(hash)

    if (
      !user?.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt <= new Date()
    ) {
      throw ApiError.badRequest('Invalid or expired verification token')
    }

    user.emailVerifiedAt = new Date()
    user.emailVerificationTokenHash = null
    user.emailVerificationTokenExpiresAt = null
    if (user.status === 'PENDING_VERIFICATION') {
      user.status = 'ACTIVE'
    }
    await user.save()

    await auditLogRepository.record({
      actorId: user._id.toString(),
      actorRole: null,
      action: 'auth.email.verified',
      entityType: 'user',
      entityId: user._id,
    })
  },

  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email)

    if (user?.status === 'PENDING_VERIFICATION') {
      const { raw, hash } = generateOpaqueTokenPair()
      user.emailVerificationTokenHash = hash
      user.emailVerificationTokenExpiresAt = minutesFromNow(env.EMAIL_VERIFICATION_TOKEN_TTL_MIN)
      await user.save()

      await enqueueAuthEmail('email-verification', {
        email: user.email,
        link: `${env.FRONTEND_URL}/verify-email?token=${raw}`,
      })

      await auditLogRepository.record({
        actorId: user._id.toString(),
        actorRole: null,
        action: 'auth.email.verification_resent',
        entityType: 'user',
        entityId: user._id,
      })
    }
    // Always returns void regardless — same anti-enumeration reasoning as forgotPassword.
  },
}
