import { delay, http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'

/**
 * In-memory stand-in for the backend's auth module, shaped exactly like the
 * real response envelopes (API-STANDARDS.md §3) and status/code combinations
 * confirmed by reading `backend/src/services/auth.service.ts` directly.
 *
 * Cookie-based refresh transport itself is exercised by the backend's own
 * 86 supertest integration tests (real cookies, real Set-Cookie headers) —
 * jsdom + MSW cookie round-tripping is unreliable in a unit-test
 * environment, so these handlers track "session validity" via explicit,
 * test-controllable state instead of real cookies. What's under test here
 * is the *frontend's* refresh-queueing/dedup/retry logic, not cookie
 * transport.
 */

export type MockAccountStatus =
  'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'LOCKED' | 'DEACTIVATED'

interface MockAccount {
  email: string
  password: string
  role: string
  permissions: string[]
  status: MockAccountStatus
  lockedUntil?: string
}

export const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  'active@example.com': {
    email: 'active@example.com',
    password: 'correct-horse-1',
    role: 'STUDENT',
    permissions: ['courses:read'],
    status: 'ACTIVE',
  },
  'admin@example.com': {
    email: 'admin@example.com',
    password: 'correct-horse-1',
    role: 'ADMIN',
    permissions: ['users:read', 'users:manage'],
    status: 'ACTIVE',
  },
  'superadmin@example.com': {
    email: 'superadmin@example.com',
    password: 'correct-horse-1',
    role: 'SUPER_ADMIN',
    permissions: ['users:read', 'users:manage', 'settings:manage'],
    status: 'ACTIVE',
  },
  'pending@example.com': {
    email: 'pending@example.com',
    password: 'correct-horse-1',
    role: 'STUDENT',
    permissions: [],
    status: 'PENDING_VERIFICATION',
  },
  'suspended@example.com': {
    email: 'suspended@example.com',
    password: 'correct-horse-1',
    role: 'STUDENT',
    permissions: [],
    status: 'SUSPENDED',
  },
  'locked@example.com': {
    email: 'locked@example.com',
    password: 'correct-horse-1',
    role: 'STUDENT',
    permissions: [],
    status: 'LOCKED',
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  },
  'deactivated@example.com': {
    email: 'deactivated@example.com',
    password: 'correct-horse-1',
    role: 'STUDENT',
    permissions: [],
    status: 'DEACTIVATED',
  },
}

let refreshOutcome: 'success' | 'unauthorized' = 'success'
let sessionEmail: string | null = null
let validAccessTokens = new Set<string>()
let tokenCounter = 0
let refreshCallCount = 0
let loginCallCount = 0
let loginDelayMs = 0

export function resetAuthMockState(): void {
  refreshOutcome = 'success'
  sessionEmail = null
  validAccessTokens = new Set()
  tokenCounter = 0
  refreshCallCount = 0
  loginCallCount = 0
  loginDelayMs = 0
}

/** Lets duplicate-submission tests keep a login request pending long enough to observe the button's disabled state. */
export function setLoginDelayMs(ms: number): void {
  loginDelayMs = ms
}

export function setRefreshOutcome(outcome: 'success' | 'unauthorized'): void {
  refreshOutcome = outcome
}

/** Lets refresh-queueing tests assert exactly how many real network calls to `/auth/refresh` happened. */
export function getRefreshCallCount(): number {
  return refreshCallCount
}

/** Lets duplicate-submission tests assert exactly how many real network calls to `/auth/login` happened. */
export function getLoginCallCount(): number {
  return loginCallCount
}

/** Simulates access-token expiry so a test can force the interceptor's refresh-and-retry path. */
export function expireAccessToken(token: string): void {
  validAccessTokens.delete(token)
}

function issueAccessToken(): string {
  tokenCounter += 1
  const token = `mock-access-token-${tokenCounter.toString()}`
  validAccessTokens.add(token)
  return token
}

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

function errorEnvelope(message: string, code: string, extra: Record<string, unknown> = {}) {
  return { success: false, message, code, requestId: 'test-request-id', ...extra }
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

function requireValidToken(request: Request): boolean {
  const token = bearerToken(request)
  return !!token && validAccessTokens.has(token)
}

export const authHandlers = [
  http.post(`${TEST_API_BASE_URL}/auth/login`, async ({ request }) => {
    loginCallCount += 1
    if (loginDelayMs > 0) {
      await delay(loginDelayMs)
    }
    const body = (await request.json()) as { email: string; password: string }
    const account = MOCK_ACCOUNTS[body.email]

    if (account?.password !== body.password || account.status === 'DEACTIVATED') {
      return HttpResponse.json(errorEnvelope('Invalid email or password', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    if (account.status === 'LOCKED') {
      return HttpResponse.json(
        errorEnvelope(
          'This account is temporarily locked due to repeated failed login attempts. Please try again later.',
          'ACCOUNT_LOCKED',
          { details: { lockedUntil: account.lockedUntil } },
        ),
        { status: 401 },
      )
    }
    if (account.status === 'SUSPENDED') {
      return HttpResponse.json(
        errorEnvelope('This account has been suspended. Please contact support.', 'FORBIDDEN'),
        { status: 403 },
      )
    }
    if (account.status === 'PENDING_VERIFICATION') {
      return HttpResponse.json(
        errorEnvelope('Please verify your email address before logging in.', 'EMAIL_NOT_VERIFIED'),
        { status: 403 },
      )
    }

    sessionEmail = account.email
    const accessToken = issueAccessToken()

    return HttpResponse.json(
      successEnvelope(
        {
          accessToken,
          user: {
            id: 'user-1',
            email: account.email,
            role: account.role,
            status: account.status,
            emailVerifiedAt: new Date().toISOString(),
            mfaEnabled: false,
            lastLoginAt: new Date().toISOString(),
          },
        },
        'Login successful',
      ),
    )
  }),

  http.post(`${TEST_API_BASE_URL}/auth/refresh`, () => {
    refreshCallCount += 1
    if (refreshOutcome === 'unauthorized' || !sessionEmail) {
      return HttpResponse.json(errorEnvelope('Invalid session', 'UNAUTHORIZED'), { status: 401 })
    }
    return HttpResponse.json(
      successEnvelope({ accessToken: issueAccessToken() }, 'Token refreshed'),
    )
  }),

  http.get(`${TEST_API_BASE_URL}/auth/me`, ({ request }) => {
    if (!requireValidToken(request) || !sessionEmail) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    const account = MOCK_ACCOUNTS[sessionEmail]
    if (!account) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    return HttpResponse.json(
      successEnvelope({
        id: 'user-1',
        email: account.email,
        role: account.role,
        status: account.status,
        emailVerifiedAt: new Date().toISOString(),
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
        permissions: account.permissions,
      }),
    )
  }),

  http.post(`${TEST_API_BASE_URL}/auth/logout`, ({ request }) => {
    if (!requireValidToken(request)) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    sessionEmail = null
    validAccessTokens = new Set()
    return HttpResponse.json(successEnvelope(null, 'Logged out successfully'))
  }),

  http.post(`${TEST_API_BASE_URL}/auth/logout-all`, ({ request }) => {
    if (!requireValidToken(request)) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    sessionEmail = null
    validAccessTokens = new Set()
    return HttpResponse.json(successEnvelope(null, 'Logged out of all devices'))
  }),

  http.post(`${TEST_API_BASE_URL}/auth/forgot-password`, () =>
    HttpResponse.json(
      successEnvelope(null, 'If that email exists, a password reset link has been sent'),
    ),
  ),

  http.post(`${TEST_API_BASE_URL}/auth/reset-password`, async ({ request }) => {
    const body = (await request.json()) as { token: string; newPassword: string }
    if (body.token === 'expired-reset-token') {
      return HttpResponse.json(errorEnvelope('Invalid or expired reset token', 'BAD_REQUEST'), {
        status: 400,
      })
    }
    if (body.token !== 'valid-reset-token') {
      return HttpResponse.json(errorEnvelope('Invalid or expired reset token', 'BAD_REQUEST'), {
        status: 400,
      })
    }
    return HttpResponse.json(successEnvelope(null, 'Password has been reset successfully'))
  }),

  http.post(`${TEST_API_BASE_URL}/auth/change-password`, async ({ request }) => {
    if (!requireValidToken(request)) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    const body = (await request.json()) as { currentPassword: string; newPassword: string }
    if (body.currentPassword !== 'correct-horse-1') {
      return HttpResponse.json(errorEnvelope('Current password is incorrect', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    return HttpResponse.json(successEnvelope(null, 'Password changed successfully'))
  }),

  http.post(`${TEST_API_BASE_URL}/auth/verify-email`, async ({ request }) => {
    const body = (await request.json()) as { token: string }
    if (body.token !== 'valid-verify-token') {
      return HttpResponse.json(
        errorEnvelope('Invalid or expired verification token', 'BAD_REQUEST'),
        { status: 400 },
      )
    }
    return HttpResponse.json(successEnvelope(null, 'Email verified successfully'))
  }),

  http.post(`${TEST_API_BASE_URL}/auth/resend-verification`, () =>
    HttpResponse.json(
      successEnvelope(
        null,
        'If that email exists and is unverified, a new verification link has been sent',
      ),
    ),
  ),

  http.get(`${TEST_API_BASE_URL}/auth/sessions`, ({ request }) => {
    if (!requireValidToken(request)) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    return HttpResponse.json(
      successEnvelope([
        {
          id: 'session-1',
          userAgent: 'Mock Browser',
          ipAddress: '127.0.0.1',
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
        },
        {
          id: 'session-2',
          userAgent: 'Other Device',
          ipAddress: '10.0.0.2',
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: false,
        },
      ]),
    )
  }),

  http.delete(`${TEST_API_BASE_URL}/auth/sessions/:id`, ({ params, request }) => {
    if (!requireValidToken(request)) {
      return HttpResponse.json(errorEnvelope('Authentication required', 'UNAUTHORIZED'), {
        status: 401,
      })
    }
    if (params.id === 'not-owned-session') {
      return HttpResponse.json(errorEnvelope('Resource not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(null, 'Session revoked'))
  }),
]
