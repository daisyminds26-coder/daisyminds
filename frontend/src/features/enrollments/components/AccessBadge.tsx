import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { EnrollmentAccessState } from '@/features/enrollments/types'

/** Renders exactly what the backend derived (`computeEnrollmentAccessState`) — never re-implements the entitlement rule from raw status/date fields client-side. */
const ACCESS_TONE: Record<EnrollmentAccessState, StatusTone> = {
  ACTIVE: 'success',
  LIFETIME: 'success',
  NOT_YET_ACTIVE: 'info',
  SUSPENDED: 'warning',
  ENDED: 'error',
  NONE: 'neutral',
}

const ACCESS_LABEL: Record<EnrollmentAccessState, string> = {
  ACTIVE: 'Access Active',
  LIFETIME: 'Lifetime Access',
  NOT_YET_ACTIVE: 'Access Not Yet Active',
  SUSPENDED: 'Access Suspended',
  ENDED: 'Access Ended',
  NONE: 'No Access',
}

export function AccessBadge({ accessState }: { accessState: EnrollmentAccessState }) {
  return <StatusBadge label={ACCESS_LABEL[accessState]} tone={ACCESS_TONE[accessState]} />
}
