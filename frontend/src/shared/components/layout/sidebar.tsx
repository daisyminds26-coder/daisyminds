import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { SidebarNav } from '@/shared/components/layout/sidebar-nav'
import { Button } from '@/shared/components/ui/button'
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
      <Link
        to="/"
        className={cn(
          'border-border flex h-16 shrink-0 items-center border-b px-4',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          DM
        </span>
        {!isCollapsed && (
          <span className="text-h3 ml-2.5 font-semibold whitespace-nowrap">Daisy Minds</span>
        )}
      </Link>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav sections={sections} areaRoot={areaRoot} collapsed={isCollapsed} />
      </div>

      <div className="border-border border-t p-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}
