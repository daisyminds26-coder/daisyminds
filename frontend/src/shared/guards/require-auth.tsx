import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/stores/auth-store'
import { PageLoader } from '@/shared/components/feedback/page-loader'

/**
 * Route-tree gate for every non-public area. SECURITY.md §3: this is a UX
 * convenience only — the real authorization boundary is the backend's
 * `requireAuth` middleware; a user blocked here has still never had a
 * successful API call to leak data from. Shows `PageLoader` while the
 * startup bootstrap (`useAuthBootstrap`) is still resolving, so a valid
 * session is never flashed to the login page and an invalid one never
 * flashes protected content.
 */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'loading') {
    return <PageLoader />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
