import { API_BASE_URL } from '@/utils/env'

export interface AuthUser {
  id: string
  email: string
  role: string
  status: string
  emailVerifiedAt: string | null
  mfaEnabled: boolean
  lastLoginAt: string | null
}

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

export class AuthApiError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AuthApiError'
    this.code = code
  }
}

async function toAuthApiError(response: Response): Promise<AuthApiError> {
  try {
    const body = (await response.json()) as { message?: string; code?: string }
    return new AuthApiError(
      body.message ?? 'Something went wrong. Please try again.',
      body.code ?? 'UNKNOWN_ERROR',
    )
  } catch {
    return new AuthApiError('Something went wrong. Please try again.', 'UNKNOWN_ERROR')
  }
}

/**
 * Calls the real, existing LMS backend login endpoint directly
 * (`POST /api/v1/auth/login`) — see `backend/src/controllers/auth.controller.ts`.
 * This is authoritative; the website never maintains its own password/user
 * store. Matches `frontend/`'s exact security posture: refresh token lives
 * only in an httpOnly cookie (`credentials: 'include'`), access token is
 * returned in the body and MUST be kept in memory only by the caller —
 * never written to localStorage/sessionStorage.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw await toAuthApiError(response)
  }

  const body = (await response.json()) as { data: LoginResult }
  return body.data
}

/**
 * Attempts to restore a session from the httpOnly refresh cookie (e.g. on
 * page load, if the visitor logged in earlier in this browser). Returns
 * `null` on any failure — a missing/expired session is an expected, silent
 * case here, not an error to surface.
 */
export async function restoreSession(): Promise<{ accessToken: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) return null
    const body = (await response.json()) as { data: { accessToken: string } }
    return body.data
  } catch {
    return null
  }
}

export interface RegisterApplicantPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

/**
 * Placeholder for the eventual `POST /api/v1/auth/register` — confirmed,
 * as of this build, NOT to exist on the backend (see `backend/src/routes/
 * auth.routes.ts`: only admin-created users via `POST /api/v1/users`, no
 * public self-registration, and `User` has no name/phone fields yet).
 *
 * This function deliberately does NOT pretend an account was created —
 * it simulates network latency (same pattern as `data/contact.ts`) and
 * resolves, but callers must not treat that as "the applicant is now an
 * authenticated user." See README's "Authentication Handoff" section for
 * what the backend needs before this can call a real endpoint.
 */
export async function registerApplicant(_payload: RegisterApplicantPayload): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700))
}
