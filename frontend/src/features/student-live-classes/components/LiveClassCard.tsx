import { CalendarDays, Clock, Video } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { StudentLiveClass } from '@/features/student-live-classes/types'

const STATUS_TONE: Record<StudentLiveClass['status'], StatusTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  LIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'error',
}

const STATUS_LABEL: Record<StudentLiveClass['status'], string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function formatWhen(startDateTime: string, timezone: string): string {
  const date = new Date(startDateTime)
  const datePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  return `${datePart} · ${timePart}`
}

interface LiveClassCardProps {
  session: StudentLiveClass
  onJoin: (session: StudentLiveClass) => void
  isJoining?: boolean
}

/** "Join Class" only renders enabled once `canJoin` is true (server-computed, 15 minutes before start until session end + grace) — before that, the card is honest about when joining opens rather than hiding the session entirely. A cancelled session gets its own clearly-labeled, non-interactive state, never silently dropped from the list. */
export function LiveClassCard({ session, onJoin, isJoining = false }: LiveClassCardProps) {
  const isCancelled = session.status === 'CANCELLED'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm font-medium">{session.title}</p>
            <p className="text-caption text-muted-foreground">
              {session.courseTitle} · {session.batchName}
            </p>
          </div>
          <StatusBadge label={STATUS_LABEL[session.status]} tone={STATUS_TONE[session.status]} />
        </div>

        <div className="text-body-sm text-muted-foreground flex flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {formatWhen(session.startDateTime, session.timezone)} ({session.timezone})
          </span>
          {session.trainerName && (
            <span className="flex items-center gap-1.5">
              <Video className="size-3.5 shrink-0" aria-hidden="true" />
              {session.trainerName}
            </span>
          )}
        </div>

        {isCancelled ? (
          <p className="text-body-sm text-destructive">This session was cancelled.</p>
        ) : session.canJoin ? (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-fit"
            disabled={isJoining}
            onClick={() => {
              onJoin(session)
            }}
          >
            {isJoining ? 'Opening…' : 'Join Class'}
          </Button>
        ) : (
          session.status !== 'COMPLETED' && (
            <p className="text-caption text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              Join available 15 minutes before class
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}
