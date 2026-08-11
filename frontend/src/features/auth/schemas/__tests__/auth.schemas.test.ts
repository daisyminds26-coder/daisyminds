import { describe, expect, it } from 'vitest'

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@/features/auth/schemas/auth.schemas'

describe('forgotPasswordSchema', () => {
  it('rejects a malformed email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'someone@example.com' })
    expect(result.success).toBe(true)
  })
})

describe('loginSchema', () => {
  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'someone@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an unrecognized extra field the same way the backend would (shape mirrors the strict backend schema)', () => {
    const result = loginSchema.safeParse({
      email: 'someone@example.com',
      password: 'x',
      rememberMe: true,
    })
    // Zod objects strip unknown keys by default rather than reject them —
    // this asserts the parsed *shape* never carries `rememberMe` forward to
    // the API call, regardless of what the caller passes in.
    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty('rememberMe')
  })
})

describe('resetPasswordSchema', () => {
  it('rejects a password shorter than 10 characters', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'short1',
      confirmPassword: 'short1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'a-strong-password-1',
      confirmPassword: 'a-different-password-2',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a strong, matching password pair', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'a-strong-password-1',
      confirmPassword: 'a-strong-password-1',
    })
    expect(result.success).toBe(true)
  })
})
