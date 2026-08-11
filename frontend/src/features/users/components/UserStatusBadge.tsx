import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { AccountStatus } from '@/features/auth/types'

const STATUS_TONE: Record<AccountStatus, StatusTone> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'info',
  SUSPENDED: 'warning',
  LOCKED: 'error',
  DEACTIVATED: 'neutral',
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending Verification',
  SUSPENDED: 'Suspended',
  LOCKED: 'Locked',
  DEACTIVATED: 'Deactivated',
}

export function UserStatusBadge({ status }: { status: AccountStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
