import type { Request, Response } from 'express'

import { env } from '../config/env'
import type { UserSessionDocument } from '../models/user-session.model'
import { authService, type RequestContext } from '../services/auth.service'
import { ApiError } from '../utils/api-error'
import { sendSuccess } from '../utils/api-response'
import { clearRefreshCookie, setRefreshCookie } from '../utils/cookies'
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validator'

function getRequestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.validated?.body as LoginInput
  const result = await authService.login(email, password, getRequestContext(req))

  setRefreshCookie(res, result.cookieValue, result.cookieExpiresAt)
  sendSuccess(res, {
    message: 'Login successful',
    data: { accessToken: result.accessToken, user: result.user },
  })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  await authService.logout(user.sessionId, user.id)

  clearRefreshCookie(res)
  sendSuccess(res, { message: 'Logged out successfully' })
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  await authService.logoutAll(user.id)

  clearRefreshCookie(res)
  sendSuccess(res, { message: 'Logged out of all devices' })
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined>
  const cookieValue = cookies[env.REFRESH_COOKIE_NAME]

  if (!cookieValue) {
    throw ApiError.unauthorized('No refresh session found')
  }

  const result = await authService.refresh(cookieValue, getRequestContext(req))

  setRefreshCookie(res, result.cookieValue, result.cookieExpiresAt)
  sendSuccess(res, { message: 'Token refreshed', data: { accessToken: result.accessToken } })
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.validated?.body as ForgotPasswordInput
  await authService.forgotPassword(email, getRequestContext(req))

  sendSuccess(res, { message: 'If that email exists, a password reset link has been sent' })
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.validated?.body as ResetPasswordInput
  await authService.resetPassword(token, newPassword)

  sendSuccess(res, { message: 'Password has been reset successfully' })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const { currentPassword, newPassword } = req.validated?.body as ChangePasswordInput
  await authService.changePassword(user.id, currentPassword, newPassword, user.sessionId)

  sendSuccess(res, { message: 'Password changed successfully' })
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.validated?.body as VerifyEmailInput
  await authService.verifyEmail(token)

  sendSuccess(res, { message: 'Email verified successfully' })
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const { email } = req.validated?.body as ResendVerificationInput
  await authService.resendVerification(email)

  sendSuccess(res, {
    message: 'If that email exists and is unverified, a new verification link has been sent',
  })
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const currentUser = await authService.getCurrentUser(user.id)

  sendSuccess(res, { data: currentUser })
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const sessions = await authService.listSessions(user.id, user.sessionId)

  sendSuccess(res, { data: sessions })
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  const user = requireUser(req)
  const session = req.ownedResource as UserSessionDocument
  await authService.revokeSessionById(session._id.toString(), user.id)

  sendSuccess(res, { message: 'Session revoked' })
}
