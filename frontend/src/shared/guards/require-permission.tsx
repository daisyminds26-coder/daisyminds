import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { PageLoader } from '@/shared/components/feedback/page-loader'

interface RequirePermissionProps {
  required: string | readonly string[]
  mode?: 'any' | 'all'
}

/** UI-only permission gate for route subtrees. See RequireAuth's SECURITY.md note — the backend's `requirePermission` middleware is authoritative. */
export function RequirePermission({ required, mode = 'all' }: RequirePermissionProps) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return <PageLoader />
  }

  const requiredList = typeof required === 'string' ? [required] : required
  const allowed =
    mode === 'all'
      ? requiredList.every((key) => user.permissions.includes(key))
      : requiredList.some((key) => user.permissions.includes(key))

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
