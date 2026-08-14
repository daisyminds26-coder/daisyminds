import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { LiveClassStatus } from '@/features/live-classes/types'

const STATUS_TONE: Record<LiveClassStatus, StatusTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  LIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'error',
}

const STATUS_LABEL: Record<LiveClassStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/** Color is never the only signal — the label text always renders alongside the tone (WCAG). */
export function LiveClassStatusBadge({ status }: { status: LiveClassStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
