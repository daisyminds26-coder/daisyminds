import { Router } from 'express'

import * as authController from '../controllers/auth.controller'
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  sessionCheckRateLimiter,
} from '../middlewares/auth-rate-limit.middleware'
import { requireAuth } from '../middlewares/require-auth.middleware'
import { requireOwnership } from '../middlewares/ownership.middleware'
import { validate } from '../middlewares/validate.middleware'
import { userSessionRepository } from '../repositories/user-session.repository'
import { asyncHandler } from '../utils/async-handler'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  sessionIdParamSchema,
  verifyEmailSchema,
  type SessionIdParam,
} from '../validators/auth.validator'

export const authRouter = Router()

/**
 * Unlike a whole feature router being uniformly public/protected
 * (API-STANDARDS.md §6's router-mounting-order pattern), `/auth` itself
 * inherently mixes both — `requireAuth` is therefore applied per-route here,
 * not for the router as a whole.
 */

// --- Public ---
authRouter.post(
  '/login',
  loginRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
)
authRouter.post('/refresh', sessionCheckRateLimiter, asyncHandler(authController.refresh))
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
)
authRouter.post(
  '/reset-password',
  passwordResetRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
)
authRouter.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  asyncHandler(authController.verifyEmail),
)
authRouter.post(
  '/resend-verification',
  passwordResetRateLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification),
)

// --- Protected ---
authRouter.post('/logout', requireAuth, asyncHandler(authController.logout))
authRouter.post('/logout-all', requireAuth, asyncHandler(authController.logoutAll))
authRouter.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
)
authRouter.get('/me', sessionCheckRateLimiter, requireAuth, asyncHandler(authController.getMe))
authRouter.get('/sessions', requireAuth, asyncHandler(authController.getSessions))
authRouter.delete(
  '/sessions/:id',
  requireAuth,
  validate({ params: sessionIdParamSchema }),
  requireOwnership((req) =>
    userSessionRepository.findActiveById((req.validated?.params as SessionIdParam).id),
  ),
  asyncHandler(authController.revokeSession),
)
