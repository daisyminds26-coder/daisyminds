import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { BatchStatus } from '@/features/batches/types'

const STATUS_TONE: Record<BatchStatus, StatusTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'error',
  ARCHIVED: 'warning',
}

const STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
}

/** Color is never the only signal — the label text always renders alongside the tone (WCAG). */
export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
