import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { EnrollmentStatus } from '@/features/enrollments/types'

const STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  PENDING: 'neutral',
  WAITLISTED: 'warning',
  CONFIRMED: 'info',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'error',
  DROPPED: 'error',
}

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  PENDING: 'Pending',
  WAITLISTED: 'Waitlisted',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DROPPED: 'Dropped',
}

/** Color is never the only signal — the label text always renders alongside the tone (WCAG). */
export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
