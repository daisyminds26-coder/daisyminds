import { Link } from 'react-router-dom'
import { LogOut, Settings, UserRound } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { UserAvatar } from '@/shared/components/data-display/user-avatar'
import type { SessionUser } from '@/shared/types/session'

interface UserDropdownProps {
  user: SessionUser
  /** Wired to the real logout flow once authentication is implemented. */
  onSignOut?: () => void
}

export function UserDropdown({ user, onSignOut }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ring-offset-background focus-visible:ring-ring flex items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Open account menu"
        >
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-body-sm truncate font-medium">{user.name}</span>
          <span className="text-caption text-muted-foreground truncate font-normal">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="profile">
            <UserRound />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
