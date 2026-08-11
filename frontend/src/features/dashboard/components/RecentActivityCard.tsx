import { formatDistanceToNow } from 'date-fns'
import { History } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Timeline, type TimelineEntry } from '@/shared/components/data-display/timeline'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import type { RecentActivityEntry } from '@/features/dashboard/types'

const ACTION_LABELS: Record<string, string> = {
  'student.created': 'Student created',
  'student.updated': 'Student updated',
  'student.activated': 'Student activated',
  'student.deactivated': 'Student deactivated',
  'student.soft_deleted': 'Student deleted',
  'student.restored': 'Student restored',
  'trainer.created': 'Trainer created',
  'trainer.updated': 'Trainer updated',
  'trainer.activated': 'Trainer activated',
  'trainer.deactivated': 'Trainer deactivated',
  'trainer.soft_deleted': 'Trainer deleted',
  'trainer.restored': 'Trainer restored',
  'user.created': 'User created',
  'user.updated': 'User updated',
  'user.activated': 'User activated',
  'user.deactivated': 'User deactivated',
  'user.soft_deleted': 'User deleted',
  'user.restored': 'User restored',
  'user.role_assigned': 'Role assigned',
}

function toTimelineEntry(entry: RecentActivityEntry): TimelineEntry {
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action
  return {
    id: entry.id,
    title: `${actionLabel} — ${entry.entityLabel}`,
    description: `by ${entry.actorLabel}`,
    timestamp: formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true }),
  }
}

interface RecentActivityCardProps {
  activity: RecentActivityEntry[] | null | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/** `SUPER_ADMIN`-only, per the backend's permission-aware response shaping — the parent only renders this for a `SUPER_ADMIN` actor; `activity === null` here is the "not authorized for this section" signal, shown as a quiet notice rather than an error. */
export function RecentActivityCard({
  activity,
  isLoading,
  isError,
  onRetry,
}: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load recent activity"
            description="Try again in a moment."
            onRetry={onRetry}
          />
        ) : activity === null || activity === undefined ? (
          <EmptyState
            icon={History}
            title="Activity feed unavailable"
            description="Requires SUPER_ADMIN access."
          />
        ) : activity.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent activity"
            description="Changes will appear here as they happen."
          />
        ) : (
          <Timeline entries={activity.map(toTimelineEntry)} />
        )}
      </CardContent>
    </Card>
  )
}
