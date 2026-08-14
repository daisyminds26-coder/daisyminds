import { useSearchParams } from 'react-router-dom'
import { Users } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AttendanceRosterPanel } from '@/features/attendance/components/AttendanceRosterPanel'
import { useMyLiveClasses } from '@/features/trainer-live-classes/hooks/use-my-live-classes'

/** Self-scoped: the session picker only ever lists sessions this trainer is assigned to; the roster panel itself calls `/trainer/live-classes/:id/attendance`, which the backend ownership-checks independently of this list. */
export default function TrainerAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId') ?? undefined

  const liveClassesQuery = useMyLiveClasses({})

  return (
    <PageContainer title="Attendance" description="Mark attendance for a session you're teaching.">
      {liveClassesQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(liveClassesQuery.error)}
          onRetry={() => void liveClassesQuery.refetch()}
        />
      )}

      {liveClassesQuery.isLoading && <ListSkeleton rows={2} />}

      {liveClassesQuery.data &&
        (liveClassesQuery.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No sessions assigned"
            description="Once you're assigned to a live class, you can mark its attendance here."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              value={sessionId}
              onValueChange={(value) => {
                setSearchParams({ sessionId: value })
              }}
            >
              <SelectTrigger className="w-full sm:max-w-md">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {liveClassesQuery.data.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.title} — {session.batchName} (
                    {new Date(session.startDateTime).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sessionId && (
              <AttendanceRosterPanel
                sessionId={sessionId}
                basePath="/trainer/live-classes"
                canFinalize={false}
              />
            )}
          </div>
        ))}
    </PageContainer>
  )
}
