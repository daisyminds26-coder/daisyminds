import { z } from 'zod'

/** SECURITY.md §2 — length matters more than mandatory special characters (NIST-aligned). */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200)
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number')

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict()
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email: z.email() }).strict()
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
  })
  .strict()
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .strict()
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const verifyEmailSchema = z
  .object({ token: z.string().min(1, 'Token is required') })
  .strict()
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const resendVerificationSchema = z.object({ email: z.email() }).strict()
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

export const sessionIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>
