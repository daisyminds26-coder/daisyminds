import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { CurriculumItemStatus } from '@/features/courses/curriculum/types'

const STATUS_TONE: Record<CurriculumItemStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
}

const STATUS_LABEL: Record<CurriculumItemStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

export function CurriculumItemStatusBadge({ status }: { status: CurriculumItemStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
