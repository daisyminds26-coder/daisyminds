import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn, formatEnumLabel } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { LiveClassStatusBadge } from '@/features/live-classes/components/LiveClassStatusBadge'
import { CancelLiveClassDialog } from '@/features/live-classes/components/CancelLiveClassDialog'
import { useLiveClass } from '@/features/live-classes/hooks/use-live-class'
import {
  useCancelLiveClass,
  useCompleteLiveClass,
  useScheduleLiveClass,
  useStartLiveClass,
} from '@/features/live-classes/hooks/use-live-class-lifecycle'
import { AttendanceRosterPanel } from '@/features/attendance/components/AttendanceRosterPanel'

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function LiveClassDetailPage() {
  const { liveClassId } = useParams<{ liveClassId: string }>()
  const [cancelOpen, setCancelOpen] = useState(false)

  const liveClassQuery = useLiveClass(liveClassId)
  const scheduleLiveClass = useScheduleLiveClass()
  const startLiveClass = useStartLiveClass()
  const completeLiveClass = useCompleteLiveClass()
  const cancelLiveClass = useCancelLiveClass()

  if (liveClassQuery.isLoading) return <PageLoader />
  if (liveClassQuery.isError || !liveClassQuery.data) {
    return (
      <PageContainer title="Live class">
        <ErrorState
          description={
            liveClassQuery.isError
              ? getSafeErrorMessage(liveClassQuery.error)
              : 'Session not found.'
          }
          onRetry={() => void liveClassQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const session = liveClassQuery.data

  return (
    <PageContainer
      title={session.title}
      description={`${session.sessionCode} · ${session.courseTitle} · ${session.batchName}`}
      actions={
        <>
          <Link
            to={`/admin/batches/${session.batchId}?tab=live-classes`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ArrowLeft className="size-3.5" />
            Back to batch
          </Link>
          {session.status === 'DRAFT' && (
            <Button
              type="button"
              size="sm"
              disabled={scheduleLiveClass.isPending}
              onClick={() => {
                scheduleLiveClass.mutate(session.id, {
                  onSuccess: () => toast.success('Session scheduled'),
                  onError: (error) =>
                    toast.error('Could not schedule session', getSafeErrorMessage(error)),
                })
              }}
            >
              Schedule
            </Button>
          )}
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
          {(session.status === 'DRAFT' ||
            session.status === 'SCHEDULED' ||
            session.status === 'LIVE') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setCancelOpen(true)
              }}
            >
              Cancel
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <LiveClassStatusBadge status={session.status} />
        {session.cancellationReason && (
          <span className="text-body-sm text-destructive">
            Cancelled: {session.cancellationReason}
          </span>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-caption text-muted-foreground">Starts</p>
                <p className="text-body-sm">
                  {formatDateTime(session.startDateTime, session.timezone)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Ends</p>
                <p className="text-body-sm">
                  {formatDateTime(session.endDateTime, session.timezone)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Delivery</p>
                <p className="text-body-sm">
                  {formatEnumLabel(session.deliveryMode)} · {formatEnumLabel(session.provider)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Trainer(s)</p>
                <p className="text-body-sm">
                  {session.trainers.length > 0
                    ? session.trainers.map((trainer) => trainer.name).join(', ')
                    : 'Unassigned'}
                </p>
              </div>
              {session.joinUrl && (
                <div>
                  <p className="text-caption text-muted-foreground">Join URL</p>
                  <p className="text-body-sm break-all">{session.joinUrl}</p>
                </div>
              )}
              {session.hostUrl && (
                <div>
                  <p className="text-caption text-muted-foreground">Host URL</p>
                  <p className="text-body-sm break-all">{session.hostUrl}</p>
                </div>
              )}
              {session.source === 'TIMETABLE_GENERATED' && (
                <div>
                  <p className="text-caption text-muted-foreground">Source</p>
                  <p className="text-body-sm">Generated from weekly timetable</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceRosterPanel sessionId={session.id} basePath="/live-classes" canFinalize />
        </TabsContent>
      </Tabs>

      <CancelLiveClassDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        isPending={cancelLiveClass.isPending}
        onConfirm={(reason) => {
          cancelLiveClass.mutate(
            { id: session.id, reason },
            {
              onSuccess: () => {
                toast.success('Session cancelled')
                setCancelOpen(false)
              },
              onError: (error) => {
                toast.error('Could not cancel session', getSafeErrorMessage(error))
              },
            },
          )
        }}
      />
    </PageContainer>
  )
}
