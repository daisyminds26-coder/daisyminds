import { Link } from 'react-router-dom'
import { Video } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { LiveClassStatusBadge } from '@/features/live-classes/components/LiveClassStatusBadge'
import { useMyLiveClasses } from '@/features/trainer-live-classes/hooks/use-my-live-classes'
import {
  useCompleteMyLiveClass,
  useStartMyLiveClass,
} from '@/features/trainer-live-classes/hooks/use-my-live-class-lifecycle'

function formatSessionTime(startDateTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(startDateTime))
}

/** Self-scoped: only sessions this trainer is assigned to (`primaryTrainerId`/`trainerIds`) — the backend's ownership check is the real gate, this UI just reflects it. */
export default function TrainerLiveClassesPage() {
  const liveClassesQuery = useMyLiveClasses({})
  const startLiveClass = useStartMyLiveClass()
  const completeLiveClass = useCompleteMyLiveClass()

  return (
    <PageContainer title="My Live Classes" description="Sessions you're assigned to teach.">
      {liveClassesQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(liveClassesQuery.error)}
          onRetry={() => void liveClassesQuery.refetch()}
        />
      )}

      {liveClassesQuery.isLoading && <ListSkeleton rows={4} />}

      {liveClassesQuery.data &&
        (liveClassesQuery.data.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No sessions assigned"
            description="Sessions an admin assigns you to teach will appear here."
          />
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {liveClassesQuery.data.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-body-sm font-medium">{session.title}</p>
                  <p className="text-caption text-muted-foreground">
                    {session.batchName} · {session.courseTitle}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {formatSessionTime(session.startDateTime, session.timezone)} ({session.timezone}
                    )
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LiveClassStatusBadge status={session.status} />
                  {session.status === 'SCHEDULED' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={startLiveClass.isPending}
                      onClick={() => {
                        startLiveClass.mutate(session.id, {
                          onSuccess: () => toast.success('Session marked live'),
                          onError: (error) =>
                            toast.error('Could not start session', getSafeErrorMessage(error)),
                        })
                      }}
                    >
                      Start
                    </Button>
                  )}
                  {session.status === 'LIVE' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={completeLiveClass.isPending}
                      onClick={() => {
                        completeLiveClass.mutate(session.id, {
                          onSuccess: () => toast.success('Session marked complete'),
                          onError: (error) =>
                            toast.error('Could not complete session', getSafeErrorMessage(error)),
                        })
                      }}
                    >
                      Mark complete
                    </Button>
                  )}
                  <Link
                    to={`/trainer/attendance?sessionId=${session.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Attendance
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </PageContainer>
  )
}
