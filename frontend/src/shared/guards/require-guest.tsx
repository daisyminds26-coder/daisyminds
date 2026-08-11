import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { getRoleDashboardPath } from '@/features/auth/utils/redirect'
import { PageLoader } from '@/shared/components/feedback/page-loader'

/** Sends an already-authenticated user away from guest-only pages (login, forgot/reset password) to their role dashboard. */
export function RequireGuest() {
  const status = useAuthStore((state) => state.status)
  const { data: user, isLoading } = useCurrentUser()

  if (status === 'loading') {
    return <PageLoader />
  }

  if (status === 'authenticated') {
    if (isLoading || !user) {
      return <PageLoader />
    }
    return <Navigate to={getRoleDashboardPath(user.role)} replace />
  }

  return <Outlet />
}
