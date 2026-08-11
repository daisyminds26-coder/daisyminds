import type { Role } from '@/shared/types/role'

const ROLE_AREA_PREFIX: Record<Role, string> = {
  SUPER_ADMIN: '/admin',
  ADMIN: '/admin',
  TRAINER: '/trainer',
  STUDENT: '/student',
}

export function getRoleDashboardPath(role: Role): string {
  return ROLE_AREA_PREFIX[role]
}

/**
 * Open-redirect guard for the post-login "return to intended route" flow.
 * Only ever returns a path within the authenticated user's own role area —
 * anything external, malformed, or belonging to a different role's area
 * falls back to that role's dashboard root.
 */
export function resolvePostLoginPath(role: Role, intendedPath: string | undefined): string {
  const dashboard = getRoleDashboardPath(role)

  if (!intendedPath || !intendedPath.startsWith('/') || intendedPath.startsWith('//')) {
    return dashboard
  }

  const prefix = ROLE_AREA_PREFIX[role]
  if (intendedPath === prefix || intendedPath.startsWith(`${prefix}/`)) {
    return intendedPath
  }

  return dashboard
}
