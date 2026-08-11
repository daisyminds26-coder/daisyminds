import { format } from 'date-fns'
import { ScrollText } from 'lucide-react'

import { Timeline, type TimelineEntry } from '@/shared/components/data-display/timeline'
import { TablePagination } from '@/shared/components/data-display/table-pagination'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useAuditLog } from '@/features/trainers/hooks/use-audit-log'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'

function describeAction(action: string): string {
  return (
    action
      .split('.')
      .pop()
      ?.replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) ?? action
  )
}

export function TrainerAuditTimeline({
  trainerId,
  page,
  onPageChange,
}: {
  trainerId: string
  page: number
  onPageChange: (page: number) => void
}) {
  const auditLogQuery = useAuditLog(trainerId, page)

  if (auditLogQuery.isLoading) {
    return <ListSkeleton rows={4} />
  }
  if (auditLogQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(auditLogQuery.error)}
        onRetry={() => void auditLogQuery.refetch()}
      />
    )
  }

  const entries = auditLogQuery.data?.data ?? []
  if (entries.length === 0) {
    return <EmptyState icon={ScrollText} title="No activity recorded" />
  }

  const timelineEntries: TimelineEntry[] = entries.map((entry) => ({
    id: entry.id,
    title: describeAction(entry.action),
    description: entry.actorRole ? `By ${entry.actorRole}` : 'System',
    timestamp: format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a'),
  }))

  return (
    <div className="flex flex-col gap-4">
      <Timeline entries={timelineEntries} />
      {auditLogQuery.data && auditLogQuery.data.meta.totalPages > 1 && (
        <TablePagination meta={auditLogQuery.data.meta} onPageChange={onPageChange} />
      )}
    </div>
  )
}
