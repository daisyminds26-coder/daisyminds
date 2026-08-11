import { describe, expect, it } from 'vitest'

import {
  buildRefreshCookieValue,
  generateOpaqueTokenPair,
  hashOpaqueToken,
  parseRefreshCookieValue,
  signAccessToken,
  verifyAccessToken,
} from '../../src/services/token.service'
import type { AuthenticatedUser } from '../../src/types/auth'

const sampleUser: AuthenticatedUser = {
  id: '507f1f77bcf86cd799439011',
  roleId: '507f1f77bcf86cd799439012',
  role: 'ADMIN',
  permissions: ['users:read', 'users:manage'],
  sessionId: '507f1f77bcf86cd799439013',
}

describe('token.service — access tokens', () => {
  it('round-trips a signed access token', () => {
    const token = signAccessToken(sampleUser)
    const decoded = verifyAccessToken(token)

    expect(decoded).toEqual(sampleUser)
  })

  it('rejects a malformed token', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow()
  })

  it('rejects a token signed with a different secret', () => {
    // A structurally valid JWT (header.payload.signature) but wrong signature.
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmb3JnZWQifQ.invalidSignatureValueHere1234567890'
    expect(() => verifyAccessToken(forged)).toThrow()
  })
})

describe('token.service — opaque tokens', () => {
  it('generates a raw/hash pair where the hash matches hashOpaqueToken(raw)', () => {
    const pair = generateOpaqueTokenPair()
    expect(hashOpaqueToken(pair.raw)).toBe(pair.hash)
  })

  it('generates a different pair on every call', () => {
    const first = generateOpaqueTokenPair()
    const second = generateOpaqueTokenPair()
    expect(first.raw).not.toBe(second.raw)
  })
})

describe('token.service — refresh cookie value', () => {
  it('round-trips sessionId and rawToken', () => {
    const value = buildRefreshCookieValue('session-123', 'raw-token-abc')
    expect(parseRefreshCookieValue(value)).toEqual({
      sessionId: 'session-123',
      rawToken: 'raw-token-abc',
    })
  })

  it('returns null for a value with no separator', () => {
    expect(parseRefreshCookieValue('no-separator-here')).toBeNull()
  })

  it('returns null for a value with an empty sessionId', () => {
    expect(parseRefreshCookieValue('.raw-token-only')).toBeNull()
  })

  it('returns null for a value with an empty raw token', () => {
    expect(parseRefreshCookieValue('session-only.')).toBeNull()
  })
})
