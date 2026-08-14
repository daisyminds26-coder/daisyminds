import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssignmentStatusBadge } from '@/features/assignments/components/AssignmentStatusBadge'
import { useMyAssignments } from '@/features/trainer-assignments/hooks/use-my-assignments'

function formatDue(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** Self-scoped: only assignments targeting a batch this trainer teaches — the backend's ownership check is the real gate, this UI just reflects it. */
export default function TrainerAssignmentsPage() {
  const assignmentsQuery = useMyAssignments()

  return (
    <PageContainer title="My Assignments" description="Assignments issued to batches you teach.">
      {assignmentsQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(assignmentsQuery.error)}
          onRetry={() => void assignmentsQuery.refetch()}
        />
      )}

      {assignmentsQuery.isLoading && <ListSkeleton rows={4} />}

      {assignmentsQuery.data &&
        (assignmentsQuery.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments"
            description="Assignments an admin issues to your batches will appear here."
          />
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {assignmentsQuery.data.map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-body-sm font-medium">{assignment.title}</p>
                  <p className="text-caption text-muted-foreground">
                    {assignment.courseTitle} ·{' '}
                    {assignment.batches.map((batch) => batch.name).join(', ')}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Due {formatDue(assignment.dueDateTime, assignment.timezone)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AssignmentStatusBadge status={assignment.status} />
                  <span className="text-caption text-muted-foreground">
                    {assignment.submittedCount} submitted · {assignment.pendingGradingCount} to
                    grade
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/trainer/assignments/${assignment.id}`}>Review</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </PageContainer>
  )
}
