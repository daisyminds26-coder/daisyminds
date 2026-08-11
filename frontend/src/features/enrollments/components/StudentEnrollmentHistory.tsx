import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

import { EmptyState } from '@/shared/components/feedback/empty-state'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useEnrollmentsList } from '@/features/enrollments/hooks/use-enrollments-list'
import { EnrollmentStatusBadge } from '@/features/enrollments/components/EnrollmentStatusBadge'
import { AccessBadge } from '@/features/enrollments/components/AccessBadge'

/**
 * Lazy-loaded (only queried while its tab is active — see call site) course/
 * batch enrolment history for a student. Read-only here; all lifecycle
 * actions live on the enrolment detail page linked from each row.
 */
export function StudentEnrollmentHistory({ studentId }: { studentId: string }) {
  const enrollmentsQuery = useEnrollmentsList({
    studentId,
    limit: 20,
    sort: 'createdAt:desc',
  })

  if (enrollmentsQuery.isLoading) return <PageLoader />
  if (enrollmentsQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(enrollmentsQuery.error)}
        onRetry={() => void enrollmentsQuery.refetch()}
      />
    )
  }

  const rows = enrollmentsQuery.data?.data ?? []

  if (rows.length === 0) {
    return <EmptyState icon={GraduationCap} title="No enrolments yet" />
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Link
          key={row.id}
          to={`/admin/enrollments/${row.id}`}
          className="border-border hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <span>
            <span className="text-body-sm block font-medium">
              {row.course?.title ?? 'Unknown course'}
            </span>
            <span className="text-caption text-muted-foreground block">
              {row.batch?.name ?? 'Unknown batch'} · {row.enrollmentCode}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <EnrollmentStatusBadge status={row.status} />
            <AccessBadge accessState={row.accessState} />
          </span>
        </Link>
      ))}
    </div>
  )
}
