import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { Sidebar } from '@/shared/components/layout/sidebar'
import { MobileNavDrawer } from '@/shared/components/layout/mobile-nav-drawer'
import { Header } from '@/shared/components/layout/header'
import { Footer } from '@/shared/components/layout/footer'
import { StudentBottomNav } from '@/shared/components/layout/student-bottom-nav'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { studentNavigation } from '@/shared/config/navigation'
import { filterNavByRole } from '@/shared/lib/nav'
import type { SessionUser } from '@/shared/types/session'

function displayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? email
  return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * A distinct shell for the Student Portal (Phase 11A) rather than
 * `DashboardLayout`/`AppShell` reused as-is — the task spec explicitly
 * wants a more spacious, learner-focused feel and a mobile bottom nav that
 * has no admin/trainer equivalent. Still built from the same underlying
 * `Sidebar`/`Header`/`MobileNavDrawer`/`Footer` primitives (those are
 * already generic nav-rail/header components, not admin-styled), so this
 * stays a composition, not a parallel design system.
 */
export function StudentShell() {
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
  const sections = filterNavByRole(studentNavigation, user.role)

  return (
    <div className="bg-muted/30 flex min-h-svh w-full">
      <Sidebar sections={sections} areaRoot="/student" />
      <MobileNavDrawer sections={sections} areaRoot="/student" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          onSignOut={() => {
            logout.mutate()
          }}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-10 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <StudentBottomNav />
    </div>
  )
}
