import { Link } from 'react-router-dom'

import { SidebarNav } from '@/shared/components/layout/sidebar-nav'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { Logo } from '@/shared/components/ui/logo'
import { useUiStore } from '@/shared/stores/ui-store'
import type { NavSection } from '@/shared/types/nav'

interface MobileNavDrawerProps {
  sections: readonly NavSection[]
  areaRoot: string
}

/** Below `lg` (UI-DESIGN-SYSTEM.md §5), navigation moves into a drawer instead of a fixed sidebar. */
export function MobileNavDrawer({ sections, areaRoot }: MobileNavDrawerProps) {
  const isOpen = useUiStore((state) => state.isMobileNavOpen)
  const closeMobileNav = useUiStore((state) => state.closeMobileNav)

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeMobileNav()
        }
      }}
    >
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-border h-16 justify-center border-b px-4">
          <SheetTitle asChild>
            <Link to="/" onClick={closeMobileNav} className="flex items-center">
              <Logo className="h-8" alt="Daisy Minds" />
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto">
          <SidebarNav sections={sections} areaRoot={areaRoot} onNavigate={closeMobileNav} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
