import { NavLink } from 'react-router-dom'

import type { NavSection } from '@/shared/types/nav'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

interface SidebarNavProps {
  sections: readonly NavSection[]
  areaRoot: string
  collapsed?: boolean
  onNavigate?: () => void
}

/**
 * Pure nav-list renderer shared by the desktop `Sidebar` and the mobile
 * drawer, so active-link logic and markup can't drift between the two.
 */
export function SidebarNav({ sections, areaRoot, collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.label && !collapsed && (
            <p className="text-caption text-muted-foreground px-3 pb-1 tracking-wide uppercase">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const link = (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.href === areaRoot}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'text-body-sm flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted',
                  )
                }
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )

            if (!collapsed) {
              return link
            }

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
