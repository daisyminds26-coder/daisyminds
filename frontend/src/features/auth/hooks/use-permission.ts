import type { ReactNode } from 'react'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'

/**
 * UI-only convenience (SECURITY.md §3: "Frontend role-based UI hiding is a
 * UX convenience, never a security boundary" — identical rule applies to
 * permissions). Hides/disables actions the backend would reject anyway;
 * the backend's `requirePermission()` middleware remains authoritative.
 */
export function usePermission(
  required: string | readonly string[],
  mode: 'any' | 'all' = 'all',
): boolean {
  const { data: user } = useCurrentUser()
  const permissions = user?.permissions ?? []
  const requiredList = typeof required === 'string' ? [required] : required

  if (requiredList.length === 0) return true

  return mode === 'all'
    ? requiredList.every((key) => permissions.includes(key))
    : requiredList.some((key) => permissions.includes(key))
}

interface CanProps {
  permission: string | readonly string[]
  mode?: 'any' | 'all'
  fallback?: ReactNode
  children: ReactNode
}

/** Declarative wrapper around `usePermission` for conditionally rendering an action/section. */
export function Can({ permission, mode = 'all', fallback = null, children }: CanProps) {
  const allowed = usePermission(permission, mode)
  return allowed ? children : fallback
}
