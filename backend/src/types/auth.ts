/**
 * Decoded shape of the access-token JWT payload, attached to `req.user` by
 * `require-auth.middleware.ts`. `role`/`permissions` are a snapshot taken at
 * token issuance (login/refresh) — see ARCHITECTURE.md / Phase 2 plan for
 * the staleness tradeoff (≤ access-token TTL) this accepts in exchange for
 * never hitting the DB on every authenticated request.
 */
export interface AuthenticatedUser {
  id: string
  roleId: string
  role: string
  permissions: string[]
  sessionId: string
}
