import { GraduationCap, Users, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

/**
 * Only routes/actions that exist today (per the phase spec — no "Create
 * course"/"Mark attendance"/etc. until those modules are built). "Add
 * student"/"Add trainer" link straight to each module's dedicated create
 * page — not a dead link to the list view mislabeled as "Add."
 */
const ACTIONS = [
  { label: 'Add student', to: '/admin/students/new', icon: GraduationCap },
  { label: 'Add trainer', to: '/admin/trainers/new', icon: Users },
  { label: 'Manage students', to: '/admin/students', icon: GraduationCap },
  { label: 'Manage trainers', to: '/admin/trainers', icon: Users },
  { label: 'Manage users', to: '/admin/users', icon: UsersRound },
] as const

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <action.icon className="size-3.5" />
            {action.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
