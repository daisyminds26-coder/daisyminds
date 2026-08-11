import { describe, expect, it } from 'vitest'

import { getRoleDashboardPath, resolvePostLoginPath } from '@/features/auth/utils/redirect'

describe('getRoleDashboardPath', () => {
  it('maps each role to its dashboard root', () => {
    expect(getRoleDashboardPath('SUPER_ADMIN')).toBe('/admin')
    expect(getRoleDashboardPath('ADMIN')).toBe('/admin')
    expect(getRoleDashboardPath('TRAINER')).toBe('/trainer')
    expect(getRoleDashboardPath('STUDENT')).toBe('/student')
  })
})

describe('resolvePostLoginPath', () => {
  it('falls back to the role dashboard when no intended path is given', () => {
    expect(resolvePostLoginPath('STUDENT', undefined)).toBe('/student')
  })

  it("returns the intended path when it is within the user's own role area", () => {
    expect(resolvePostLoginPath('STUDENT', '/student/courses')).toBe('/student/courses')
  })

  it("falls back to the dashboard when the intended path belongs to a different role's area", () => {
    expect(resolvePostLoginPath('STUDENT', '/admin/settings')).toBe('/student')
  })

  it('falls back to the dashboard for a protocol-relative (open-redirect) path', () => {
    expect(resolvePostLoginPath('STUDENT', '//evil.example.com')).toBe('/student')
  })

  it('falls back to the dashboard for a path that does not start with a slash', () => {
    expect(resolvePostLoginPath('STUDENT', 'https://evil.example.com')).toBe('/student')
  })
})
