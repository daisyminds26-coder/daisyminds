import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { RosterAttendanceStatus } from '@/features/attendance/types'

const STATUS_TONE: Record<RosterAttendanceStatus, StatusTone> = {
  PRESENT: 'success',
  LATE: 'warning',
  ABSENT: 'error',
  EXCUSED: 'info',
  UNMARKED: 'neutral',
}

const STATUS_LABEL: Record<RosterAttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  EXCUSED: 'Excused',
  UNMARKED: 'Unmarked',
}

/** Color is never the only signal — the label text always renders alongside the tone (WCAG, no color-only attendance states). */
export function AttendanceStatusBadge({ status }: { status: RosterAttendanceStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
