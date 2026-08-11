/**
 * Re-exported from `shared/lib/auth-session-store.ts` — the store itself
 * lives there because `shared/lib/api-client.ts` (feature-agnostic
 * infrastructure) needs synchronous, non-React access to it too, and
 * `shared/` must never import from `features/*`. Feature/component code
 * should still import it from here, through the feature's own barrel.
 */
export {
  useAuthSessionStore as useAuthStore,
  type AuthStatus,
} from '@/shared/lib/auth-session-store'
