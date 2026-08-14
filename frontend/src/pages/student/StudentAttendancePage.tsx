import { CalendarCheck } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge'
import { useStudentAttendanceOverview } from '@/features/student-live-classes/hooks/use-student-attendance-overview'

export default function StudentAttendancePage() {
  const overviewQuery = useStudentAttendanceOverview()

  return (
    <PageContainer
      title="Attendance"
      description="Your attendance across every course with at least one finalized live class."
    >
      {overviewQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(overviewQuery.error)}
          onRetry={() => void overviewQuery.refetch()}
        />
      )}

      {overviewQuery.isLoading && <ListSkeleton rows={3} />}

      {overviewQuery.data && (
        <>
          <SectionContainer title="By course">
            {overviewQuery.data.courses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={CalendarCheck}
                    title="No finalized sessions yet"
                    description="Your attendance percentage appears here once a trainer finalizes a session."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {overviewQuery.data.courses.map(({ courseId, courseTitle, summary }) => (
                  <Card key={courseId}>
                    <CardContent className="flex flex-col gap-3 pt-6">
                      <p className="text-body-sm font-medium">{courseTitle}</p>
                      <div className="flex items-center gap-3">
                        <Progress value={summary.attendancePercentage} className="h-2 flex-1" />
                        <span className="text-body-sm font-semibold">
                          {summary.attendancePercentage}%
                        </span>
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {summary.presentCount} present · {summary.lateCount} late ·{' '}
                        {summary.absentCount} absent · {summary.excusedCount} excused (
                        {summary.totalFinalizedSessions} sessions)
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionContainer>

          <SectionContainer title="Recent sessions">
            {overviewQuery.data.recentRecords.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No recorded sessions yet.</p>
            ) : (
              <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                {overviewQuery.data.recentRecords.map((record) => (
                  <li
                    key={record.sessionId}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-sm font-medium">{record.sessionTitle}</span>
                      <span className="text-caption text-muted-foreground">
                        {record.courseTitle} · {record.batchName} ·{' '}
                        {new Date(record.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    <AttendanceStatusBadge status={record.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionContainer>
        </>
      )}
    </PageContainer>
  )
}
