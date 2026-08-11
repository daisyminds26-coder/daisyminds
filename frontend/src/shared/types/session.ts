import type { Role } from '@/shared/types/role'

/**
 * Shape the layout/nav components render against. This phase builds the UI
 * shell only — no auth store exists yet (explicitly out of scope) — so
 * every consumer takes this as a prop rather than reading a global "current
 * user" singleton, keeping these components pure and trivial to wire to a
 * real auth store later without changing their internals.
 */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
}
