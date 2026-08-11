import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { ContentStatus } from '@/features/courses/curriculum/content/types'

const STATUS_TONE: Record<ContentStatus, StatusTone> = {
  EMPTY: 'neutral',
  INCOMPLETE: 'warning',
  READY: 'success',
  PROCESSING: 'info',
  ERROR: 'error',
  NOT_CONFIGURED: 'neutral',
}

const STATUS_LABEL: Record<ContentStatus, string> = {
  EMPTY: 'No content',
  INCOMPLETE: 'Incomplete',
  READY: 'Content ready',
  PROCESSING: 'Processing',
  ERROR: 'Upload failed',
  NOT_CONFIGURED: 'Coming soon',
}

/** Never color-only — the label always renders alongside the tone (UI-DESIGN-SYSTEM.md §9). */
export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
