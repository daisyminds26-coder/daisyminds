import { z } from 'zod'

/**
 * Client-side shape validation only — mirrors
 * `backend/src/validators/auth.validator.ts#passwordSchema` exactly (min
 * 10 chars, max 200, at least one letter and one number) for immediate UX
 * feedback. This is defense-in-depth, never the security boundary: the
 * server re-validates independently (API-STANDARDS.md §5 — "never trust
 * frontend input").
 */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be at most 200 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * No `rememberMe` field — the backend has no concept of it (a single fixed
 * `JWT_REFRESH_EXPIRES_IN` cookie lifetime always applies), and its login
 * schema is `.strict()`, so sending an extra field would 400. Matches
 * `backend/src/validators/auth.validator.ts#loginSchema` field-for-field.
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const resendVerificationSchema = z.object({
  email: z.email('Enter a valid email address'),
})
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>
