/**
 * Frontend-local role union. Mirrors DATABASE.md's seeded system roles
 * (`roles` collection) but is intentionally not imported from the backend —
 * the two are separate deployables and the frontend only needs the role
 * name to drive UI-level navigation/route visibility (SECURITY.md §3: this
 * is a UX convenience, never a security boundary; the server enforces the
 * real permission checks).
 */
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'STUDENT'

export const ROLES: readonly Role[] = ['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'STUDENT']
