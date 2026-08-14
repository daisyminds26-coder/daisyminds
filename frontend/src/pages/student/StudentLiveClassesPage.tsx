import { useMemo } from 'react'
import { Video } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { LiveClassCard } from '@/features/student-live-classes/components/LiveClassCard'
import { useStudentLiveClasses } from '@/features/student-live-classes/hooks/use-student-live-classes'
import { useJoinLiveClass } from '@/features/student-live-classes/hooks/use-join-live-class'
import type { StudentLiveClass } from '@/features/student-live-classes/types'

function dateKeyInBrowserZone(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export default function StudentLiveClassesPage() {
  const liveClassesQuery = useStudentLiveClasses()
  const joinLiveClass = useJoinLiveClass()

  const groups = useMemo(() => {
    const sessions = liveClassesQuery.data ?? []
    const todayKey = new Date().toISOString().slice(0, 10)
    const today: StudentLiveClass[] = []
    const upcoming: StudentLiveClass[] = []
    const past: StudentLiveClass[] = []

    for (const session of sessions) {
      const key = dateKeyInBrowserZone(session.startDateTime)
      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        past.push(session)
      } else if (key === todayKey) {
        today.push(session)
      } else if (new Date(session.startDateTime) > new Date()) {
        upcoming.push(session)
      } else {
        past.push(session)
      }
    }
    return { today, upcoming, past: past.reverse() }
  }, [liveClassesQuery.data])

  function handleJoin(session: StudentLiveClass) {
    joinLiveClass.mutate(session.id, {
      onSuccess: (details) => {
        window.open(details.joinUrl, '_blank', 'noopener,noreferrer')
      },
      onError: (error) => {
        toast.error("Can't join right now", getSafeErrorMessage(error))
      },
    })
  }

  return (
    <PageContainer
      title="Live Classes"
      description="Your scheduled, live, and past class sessions."
    >
      {liveClassesQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(liveClassesQuery.error)}
          onRetry={() => void liveClassesQuery.refetch()}
        />
      )}

      {liveClassesQuery.isLoading && <ListSkeleton rows={3} />}

      {liveClassesQuery.data && (
        <>
          <SectionContainer title="Today">
            {groups.today.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No live classes today.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groups.today.map((session) => (
                  <LiveClassCard
                    key={session.id}
                    session={session}
                    onJoin={handleJoin}
                    isJoining={joinLiveClass.isPending && joinLiveClass.variables === session.id}
                  />
                ))}
              </div>
            )}
          </SectionContainer>

          <SectionContainer title="Upcoming">
            {groups.upcoming.length === 0 ? (
              <EmptyState
                icon={Video}
                title="Nothing else upcoming"
                description="New sessions will appear here once your trainer schedules them."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groups.upcoming.map((session) => (
                  <LiveClassCard
                    key={session.id}
                    session={session}
                    onJoin={handleJoin}
                    isJoining={joinLiveClass.isPending && joinLiveClass.variables === session.id}
                  />
                ))}
              </div>
            )}
          </SectionContainer>

          {groups.past.length > 0 && (
            <SectionContainer title="Past">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groups.past.map((session) => (
                  <LiveClassCard key={session.id} session={session} onJoin={handleJoin} />
                ))}
              </div>
            </SectionContainer>
          )}
        </>
      )}
    </PageContainer>
  )
}
