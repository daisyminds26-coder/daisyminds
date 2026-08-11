import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { CourseVisibility } from '@/features/courses/types'

const TONE: Record<CourseVisibility, StatusTone> = {
  PUBLIC: 'success',
  INTERNAL: 'info',
  PRIVATE: 'neutral',
}

const LABEL: Record<CourseVisibility, string> = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  PRIVATE: 'Private',
}

export function VisibilityBadge({ visibility }: { visibility: CourseVisibility }) {
  return <StatusBadge label={LABEL[visibility]} tone={TONE[visibility]} />
}
