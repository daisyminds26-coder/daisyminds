import { beforeEach, describe, expect, it } from 'vitest'

import { login } from '@/features/auth/api/auth.api'
import { useAuthSessionStore } from '@/shared/lib/auth-session-store'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('auth session storage', () => {
  it('never writes the access token to localStorage or sessionStorage', async () => {
    const result = await login('active@example.com', 'correct-horse-1')
    useAuthSessionStore.getState().setAccessToken(result.accessToken)

    const localStorageDump = JSON.stringify(window.localStorage)
    const sessionStorageDump = JSON.stringify(window.sessionStorage)

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      expect(key ? window.localStorage.getItem(key) : null).not.toContain(result.accessToken)
    }
    expect(localStorageDump).not.toContain(result.accessToken)
    expect(sessionStorageDump).not.toContain(result.accessToken)
  })

  it('holds the access token only in memory (Zustand state), not in any Storage', () => {
    useAuthSessionStore.getState().setAccessToken('a-fake-access-token-value')

    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(useAuthSessionStore.getState().accessToken).toBe('a-fake-access-token-value')
  })
})
