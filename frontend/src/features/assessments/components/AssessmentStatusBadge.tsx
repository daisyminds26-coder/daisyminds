import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { AssessmentStatus } from '@/features/assessments/types'

const STATUS_TONE: Record<AssessmentStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  CLOSED: 'info',
  RESULT_PUBLISHED: 'info',
  ARCHIVED: 'neutral',
  CANCELLED: 'error',
}

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
  RESULT_PUBLISHED: 'Results published',
  ARCHIVED: 'Archived',
  CANCELLED: 'Cancelled',
}

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
