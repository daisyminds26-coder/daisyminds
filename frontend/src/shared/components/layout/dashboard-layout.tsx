import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { AppShell } from '@/shared/components/layout/app-shell'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { navigationByArea, type NavigationArea } from '@/shared/config/navigation'
import { filterNavByRole } from '@/shared/lib/nav'
import type { SessionUser } from '@/shared/types/session'

const areaRoots: Record<NavigationArea, string> = {
  admin: '/admin',
  trainer: '/trainer',
  student: '/student',
}

/** The backend's auth identity is email-only (no display name — see backend/src/models/user.model.ts) — derive something readable from the email's local part rather than showing the raw address everywhere. */
function displayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? email
  return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Route-level layout for a role-scoped dashboard area, rendered by the
 * router at `/admin`, `/trainer`, `/student`. Wraps `AppShell` with the
 * area's nav sections (filtered to the current role) and renders the
 * matched child route via `<Outlet />`, lazily, behind a `Suspense`
 * boundary. Rendered only once `RequireAuth` has already confirmed
 * `status === 'authenticated'`, but the profile query can still be
 * in flight — shows `PageLoader` until it resolves.
 */
export function DashboardLayout({ area }: { area: NavigationArea }) {
  const { data: authUser, isLoading } = useCurrentUser()
  const logout = useLogout()

  if (isLoading || !authUser) {
    return <PageLoader />
  }

  const user: SessionUser = {
    id: authUser.id,
    name: displayNameFromEmail(authUser.email),
    email: authUser.email,
    role: authUser.role,
  }
  const sections = filterNavByRole(navigationByArea[area], user.role)

  return (
    <AppShell
      sections={sections}
      areaRoot={areaRoots[area]}
      user={user}
      onSignOut={() => {
        logout.mutate()
      }}
    >
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
