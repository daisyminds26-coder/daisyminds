import { createHash, randomBytes } from 'node:crypto'

import jwt from 'jsonwebtoken'

import { env } from '../config/env'
import { ApiError } from '../utils/api-error'
import type { AuthenticatedUser } from '../types/auth'

interface AccessTokenPayload {
  sub: string
  roleId: string
  role: string
  permissions: string[]
  sessionId: string
}

/**
 * jsonwebtoken types `expiresIn` as a branded string literal type it can't
 * infer from an arbitrary `string`. `env.JWT_ACCESS_EXPIRES_IN` is validated
 * against the exact same pattern (`\d+[smhd]`) at startup (env.schema.ts),
 * so this cast reflects a genuine runtime guarantee, not a bypass.
 */
export function signAccessToken(user: AuthenticatedUser): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    roleId: user.roleId,
    role: user.role,
    permissions: user.permissions,
    sessionId: user.sessionId,
  }

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  let decoded: jwt.JwtPayload | string

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token')
  }

  if (typeof decoded === 'string') {
    throw ApiError.unauthorized('Invalid access token payload')
  }

  const payload = decoded as jwt.JwtPayload & Partial<AccessTokenPayload>
  const { sub, roleId, role, permissions, sessionId } = payload

  if (
    typeof sub !== 'string' ||
    typeof roleId !== 'string' ||
    typeof role !== 'string' ||
    typeof sessionId !== 'string' ||
    !Array.isArray(permissions)
  ) {
    throw ApiError.unauthorized('Invalid access token payload')
  }

  return { id: sub, roleId, role, sessionId, permissions }
}

export interface OpaqueTokenPair {
  /** Sent to the client (cookie value component / email link) — never stored. */
  raw: string
  /** Stored server-side for later comparison. */
  hash: string
}

/**
 * Refresh, email-verification, and password-reset tokens are all
 * high-entropy random values, not user-chosen secrets — a fast
 * cryptographic hash (SHA-256) is the correct tool for comparing them,
 * deliberately NOT Argon2/bcrypt. Those algorithms are slow specifically to
 * resist brute-forcing a *guessable* low-entropy password; a 256-bit random
 * token is already infeasible to brute-force regardless of hash speed, so a
 * slow hash here would only add latency for no security benefit.
 */
export function generateOpaqueTokenPair(): OpaqueTokenPair {
  const raw = randomBytes(32).toString('hex')
  return { raw, hash: hashOpaqueToken(raw) }
}

export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Refresh cookie value is `sessionId.rawToken` — an O(1) lookup by sessionId before hash-comparing the token. */
export function buildRefreshCookieValue(sessionId: string, rawToken: string): string {
  return `${sessionId}.${rawToken}`
}

export function parseRefreshCookieValue(
  value: string,
): { sessionId: string; rawToken: string } | null {
  const separatorIndex = value.indexOf('.')
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null

  return {
    sessionId: value.slice(0, separatorIndex),
    rawToken: value.slice(separatorIndex + 1),
  }
}
