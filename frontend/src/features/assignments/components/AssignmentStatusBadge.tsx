import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { AssignmentStatus } from '@/features/assignments/types'

const STATUS_TONE: Record<AssignmentStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  CLOSED: 'info',
  ARCHIVED: 'neutral',
  CANCELLED: 'error',
}

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
  CANCELLED: 'Cancelled',
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
