import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { AssignmentSubmissionStatus } from '@/features/assignments/types'

export type RosterSubmissionStatus = AssignmentSubmissionStatus | 'UNSUBMITTED'

const STATUS_TONE: Record<RosterSubmissionStatus, StatusTone> = {
  UNSUBMITTED: 'neutral',
  DRAFT: 'warning',
  SUBMITTED: 'info',
  RETURNED: 'error',
  GRADED: 'success',
}

const STATUS_LABEL: Record<RosterSubmissionStatus, string> = {
  UNSUBMITTED: 'Not submitted',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  GRADED: 'Graded',
}

export function SubmissionStatusBadge({ status }: { status: RosterSubmissionStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
