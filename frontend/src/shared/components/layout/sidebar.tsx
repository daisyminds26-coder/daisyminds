import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { SidebarNav } from '@/shared/components/layout/sidebar-nav'
import { Button } from '@/shared/components/ui/button'
import { Logo } from '@/shared/components/ui/logo'
import { useUiStore } from '@/shared/stores/ui-store'
import type { NavSection } from '@/shared/types/nav'
import { cn } from '@/shared/lib/utils'

interface SidebarProps {
  sections: readonly NavSection[]
  areaRoot: string
}

/**
 * Desktop/tablet sidebar (`lg` and up — below that the mobile drawer takes
 * over, see `MobileNavDrawer`). Collapse state lives in `useUiStore` so it
 * persists across navigation and reloads.
 */
export function Sidebar({ sections, areaRoot }: SidebarProps) {
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <aside
      className={cn(
        'border-border bg-sidebar sticky top-0 hidden h-svh shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        isCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'border-border flex shrink-0 items-center gap-2 border-b px-3 py-2',
          isCollapsed && 'justify-center px-2',
        )}
      >
        {!isCollapsed && (
          <Link to="/" aria-label="Daisy Minds home" className="flex min-w-0 items-center">
            <Logo className="h-16" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0', !isCollapsed && 'ml-auto')}
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-6" />
          ) : (
            <PanelLeftClose className="size-6" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav sections={sections} areaRoot={areaRoot} collapsed={isCollapsed} />
      </div>
    </aside>
  )
}
