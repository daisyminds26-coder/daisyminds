import type { StatusTone } from '@/shared/components/data-display/status-badge'
import type { EnrollmentAccessState } from '@/features/student-portal/types'

const ACCESS_STATE_LABELS: Record<EnrollmentAccessState, string> = {
  ACTIVE: 'Active access',
  LIFETIME: 'Lifetime access',
  NOT_YET_ACTIVE: 'Starts soon',
  SUSPENDED: 'Access paused',
  ENDED: 'Access ended',
  NONE: 'No access',
}

const ACCESS_STATE_TONES: Record<EnrollmentAccessState, StatusTone> = {
  ACTIVE: 'success',
  LIFETIME: 'success',
  NOT_YET_ACTIVE: 'info',
  SUSPENDED: 'warning',
  ENDED: 'neutral',
  NONE: 'neutral',
}

export function accessStateLabel(state: EnrollmentAccessState): string {
  return ACCESS_STATE_LABELS[state]
}

export function accessStateTone(state: EnrollmentAccessState): StatusTone {
  return ACCESS_STATE_TONES[state]
}
