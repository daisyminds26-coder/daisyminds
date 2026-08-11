import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { ProfileCompletionStatus } from '@/features/students/types'

const TONE: Record<ProfileCompletionStatus, StatusTone> = {
  COMPLETE: 'success',
  PARTIAL: 'warning',
  INCOMPLETE: 'error',
}

interface ProfileCompletionBadgeProps {
  status: ProfileCompletionStatus
  percentage: number
}

/** Server-calculated (student-management.service.ts#calculateProfileCompletion) — never editable from here. */
export function ProfileCompletionBadge({ status, percentage }: ProfileCompletionBadgeProps) {
  return <StatusBadge label={`${String(percentage)}% complete`} tone={TONE[status]} />
}
