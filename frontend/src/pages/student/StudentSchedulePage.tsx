import { CalendarCheck } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { useStudentSchedule } from '@/features/student-portal'

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function StudentSchedulePage() {
  const { data, isLoading, isError, refetch } = useStudentSchedule()

  return (
    <PageContainer
      title="Schedule"
      description="Upcoming class times for your active courses, based on each batch's weekly timetable."
    >
      {isError && <ErrorState title="Couldn't load your schedule" onRetry={() => void refetch()} />}

      {isLoading && <ListSkeleton rows={5} />}

      {data && (
        <>
          {data.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={CalendarCheck}
                  title="Nothing scheduled right now"
                  description="Once you have an active Enrollllment with a weekly timetable, upcoming sessions will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {data.map((occurrence, index) => (
                <Card key={`${occurrence.date}-${occurrence.startTime}-${String(index)}`}>
                  <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">{occurrence.courseTitle}</p>
                      <p className="text-body-sm text-muted-foreground">{occurrence.batchName}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <p className="text-body-sm font-medium">{formatDate(occurrence.date)}</p>
                      <p className="text-caption text-muted-foreground">
                        {occurrence.startTime}–{occurrence.endTime}
                      </p>
                      <Badge variant="outline">{occurrence.deliveryMode}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
