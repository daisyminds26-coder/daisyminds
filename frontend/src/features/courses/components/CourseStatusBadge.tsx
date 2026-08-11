import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { CourseStatus } from '@/features/courses/types'

const STATUS_TONE: Record<CourseStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
}

const STATUS_LABEL: Record<CourseStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
