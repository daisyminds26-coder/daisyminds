import { Bell } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { EmptyState } from '@/shared/components/feedback/empty-state'

/**
 * Placeholder — the notification feed is a future module (ROADMAP.md
 * Phase 16). The empty state below is the real, permanent state until that
 * module ships; no unread-count badge is shown since there is no real data
 * source to drive it yet.
 */
export function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border border-b px-4 py-3">
          <p className="text-body-sm font-semibold">Notifications</p>
        </div>
        <div className="p-6">
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="You'll see updates about your courses and account here."
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
