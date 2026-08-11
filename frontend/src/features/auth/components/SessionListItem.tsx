import { formatDistanceToNow } from 'date-fns'
import { Laptop, Smartphone } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import type { SessionSummary } from '@/features/auth/types'

function isMobileUserAgent(userAgent: string): boolean {
  return /mobile|android|iphone/i.test(userAgent)
}

interface SessionListItemProps {
  session: SessionSummary
  onRevoke: (sessionId: string) => void
  isRevoking?: boolean
}

export function SessionListItem({ session, onRevoke, isRevoking }: SessionListItemProps) {
  const Icon = session.userAgent && isMobileUserAgent(session.userAgent) ? Smartphone : Laptop
  const deviceLabel = session.userAgent ?? 'Unknown device'

  return (
    <div className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-body-sm flex items-center gap-2 font-medium">
            <span className="truncate">{deviceLabel}</span>
            {session.isCurrent && <StatusBadge label="This device" tone="success" />}
          </p>
          <p className="text-caption text-muted-foreground">
            Last active{' '}
            {session.lastUsedAt
              ? formatDistanceToNow(new Date(session.lastUsedAt), { addSuffix: true })
              : 'never'}
          </p>
        </div>
      </div>
      {!session.isCurrent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRevoking}
          onClick={() => {
            onRevoke(session.id)
          }}
        >
          Revoke
        </Button>
      )}
    </div>
  )
}
