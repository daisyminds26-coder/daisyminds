import { create } from 'zustand'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthSessionState {
  status: AuthStatus
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  setStatus: (status: AuthStatus) => void
  reset: () => void
}

/**
 * Lives in `shared/lib`, not `features/auth/stores`, even though only the
 * auth feature triggers its actions: `shared/lib/api-client.ts`'s refresh
 * interceptor needs synchronous, non-React access to the current access
 * token (`useAuthSessionStore.getState()`), and `shared/` must not import
 * from `features/*` (CODING-STANDARDS.md §3). `features/auth/stores/auth-store.ts`
 * re-exports this for feature/component code, so callers still reach it
 * through the feature's own barrel.
 *
 * Holds only the token lifecycle — the user *profile* (email, role,
 * permissions, ...) lives in TanStack Query's `['auth','me']` cache, never
 * duplicated here (see `features/auth/hooks/use-current-user.ts`).
 */
export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  status: 'loading',
  accessToken: null,
  setAccessToken: (token) => {
    set({ accessToken: token })
  },
  setStatus: (status) => {
    set({ status })
  },
  reset: () => {
    set({ status: 'unauthenticated', accessToken: null })
  },
}))
