import { NavLink } from 'react-router-dom'
import { BookOpen, CalendarCheck, CircleUserRound, LayoutDashboard } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

const PRIMARY_ITEMS = [
  { id: 'dashboard', label: 'Home', href: '/student', icon: LayoutDashboard, end: true },
  { id: 'courses', label: 'Courses', href: '/student/courses', icon: BookOpen, end: false },
  { id: 'schedule', label: 'Schedule', href: '/student/schedule', icon: CalendarCheck, end: false },
  { id: 'profile', label: 'Profile', href: '/student/profile', icon: CircleUserRound, end: false },
] as const

/**
 * Mobile-only quick-access bar for the student portal's four primary
 * learner actions (task spec's own recommendation) — the full nav (incl.
 * Resources, Settings, Notifications, Certificates) stays reachable via the
 * header's hamburger drawer, this is a thumb-reach shortcut on top of it,
 * not a replacement for it.
 */
export function StudentBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      {PRIMARY_ITEMS.map((item) => (
        <NavLink
          key={item.id}
          to={item.href}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex min-w-16 flex-1 flex-col items-center gap-1 py-2.5 text-center transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          <item.icon className="size-5" aria-hidden="true" />
          <span className="text-caption font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
