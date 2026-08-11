import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import type { Role } from '@/shared/types/role'

interface RequireRoleProps {
  allowed: readonly Role[]
}

/** UI-only role gate for route subtrees (e.g. `/admin/settings` — SUPER_ADMIN only). See RequireAuth's SECURITY.md note. */
export function RequireRole({ allowed }: RequireRoleProps) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return <PageLoader />
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
