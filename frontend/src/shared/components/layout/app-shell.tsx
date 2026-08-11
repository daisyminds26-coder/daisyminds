import type { ReactNode } from 'react'

import { Sidebar } from '@/shared/components/layout/sidebar'
import { MobileNavDrawer } from '@/shared/components/layout/mobile-nav-drawer'
import { Header } from '@/shared/components/layout/header'
import { Footer } from '@/shared/components/layout/footer'
import type { NavSection } from '@/shared/types/nav'
import type { SessionUser } from '@/shared/types/session'

interface AppShellProps {
  sections: readonly NavSection[]
  areaRoot: string
  user: SessionUser
  onSignOut?: () => void
  children: ReactNode
}

/**
 * The application shell: sidebar (desktop/tablet) + drawer (mobile) +
 * header + footer, wrapping a scrollable content area. Role-specific
 * layouts (`DashboardLayout`) configure this with their nav sections;
 * `AppShell` itself has no notion of "admin" vs "trainer" vs "student".
 */
export function AppShell({ sections, areaRoot, user, onSignOut, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar sections={sections} areaRoot={areaRoot} />
      <MobileNavDrawer sections={sections} areaRoot={areaRoot} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onSignOut={onSignOut} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
