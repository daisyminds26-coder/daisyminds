import { Menu } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { NotificationBell } from '@/shared/components/layout/notification-bell'
import { UserDropdown } from '@/shared/components/layout/user-dropdown'
import { PageBreadcrumb } from '@/shared/components/layout/page-breadcrumb'
import { useUiStore } from '@/shared/stores/ui-store'
import type { SessionUser } from '@/shared/types/session'

interface HeaderProps {
  user: SessionUser
  onSignOut?: () => void
}

export function Header({ user, onSignOut }: HeaderProps) {
  const openMobileNav = useUiStore((state) => state.openMobileNav)

  return (
    <header className="dark-surface border-border bg-background text-foreground sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={openMobileNav}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="hidden lg:block">
        <PageBreadcrumb />
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <NotificationBell />
        <UserDropdown user={user} onSignOut={onSignOut} />
      </div>
    </header>
  )
}
