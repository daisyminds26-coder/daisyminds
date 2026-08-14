import { Users } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge'
import {
  ATTENDANCE_STATUSES,
  type AttendanceRosterRow,
  type AttendanceStatus,
} from '@/features/attendance/types'

const QUICK_STATUSES: { status: AttendanceStatus; label: string }[] = ATTENDANCE_STATUSES.map(
  (status) => ({
    status,
    label: status.charAt(0) + status.slice(1).toLowerCase(),
  }),
)

interface AttendanceRosterTableProps {
  roster: AttendanceRosterRow[]
  pending: Record<string, AttendanceStatus>
  readOnly: boolean
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  onMark: (studentId: string, status: AttendanceStatus) => void
}

/**
 * Row-card layout (not a wide table) so it stays usable on tablet/mobile
 * without any horizontal scroll (task's own requirement) — each row wraps
 * to a stacked layout below the `sm` breakpoint. Quick-toggle buttons are
 * large touch targets; the currently-selected status (pending edit, or the
 * already-saved value if untouched) is the only one filled in, matching
 * the "no color-only state" rule via the accompanying `AttendanceStatusBadge`.
 */
export function AttendanceRosterTable({
  roster,
  pending,
  readOnly,
  isLoading,
  errorMessage,
  onRetry,
  onMark,
}: AttendanceRosterTableProps) {
  if (isLoading) return <ListSkeleton rows={5} />
  if (errorMessage) return <ErrorState description={errorMessage} onRetry={onRetry} />
  if (roster.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No eligible students"
        description="No ACTIVE or CONFIRMED Enrollllments were found for this session's batch."
      />
    )
  }

  return (
    <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
      {roster.map((row) => {
        const effectiveStatus = pending[row.studentId] ?? row.status
        return (
          <li
            key={row.studentId}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-sm truncate font-medium">{row.studentName}</span>
              <span className="text-caption text-muted-foreground font-mono">
                {row.studentCode}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AttendanceStatusBadge status={effectiveStatus} />
              {!readOnly && (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={`Mark attendance for ${row.studentName}`}
                >
                  {QUICK_STATUSES.map(({ status, label }) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={effectiveStatus === status ? 'default' : 'outline'}
                      className={cn('min-w-[4.5rem]')}
                      aria-pressed={effectiveStatus === status}
                      onClick={() => {
                        onMark(row.studentId, status)
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
