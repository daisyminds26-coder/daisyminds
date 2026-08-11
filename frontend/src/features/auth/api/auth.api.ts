import { apiDelete, apiGet, apiPost } from '@/shared/lib/api-client'
import type {
  AuthUser,
  LoginResponseData,
  RefreshResponseData,
  SessionSummary,
} from '@/features/auth/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/auth.routes.ts` and
 * `backend/src/validators/auth.validator.ts` exactly — this is the only
 * file in the app that talks to `/auth/*`. No component or page calls
 * `apiClient`/`apiPost`/etc. directly.
 */

export function login(email: string, password: string): Promise<LoginResponseData> {
  return apiPost<LoginResponseData>('/auth/login', { email, password })
}

export function refresh(): Promise<RefreshResponseData> {
  return apiPost<RefreshResponseData>('/auth/refresh')
}

export function logout(): Promise<null> {
  return apiPost<null>('/auth/logout')
}

export function logoutAll(): Promise<null> {
  return apiPost<null>('/auth/logout-all')
}

export function forgotPassword(email: string): Promise<null> {
  return apiPost<null>('/auth/forgot-password', { email })
}

export function resetPassword(token: string, newPassword: string): Promise<null> {
  return apiPost<null>('/auth/reset-password', { token, newPassword })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<null> {
  return apiPost<null>('/auth/change-password', { currentPassword, newPassword })
}

export function verifyEmail(token: string): Promise<null> {
  return apiPost<null>('/auth/verify-email', { token })
}

export function resendVerification(email: string): Promise<null> {
  return apiPost<null>('/auth/resend-verification', { email })
}

export function getMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me')
}

export function getSessions(): Promise<SessionSummary[]> {
  return apiGet<SessionSummary[]>('/auth/sessions')
}

export function revokeSession(sessionId: string): Promise<null> {
  return apiDelete<null>(`/auth/sessions/${sessionId}`)
}
