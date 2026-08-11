import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { Role } from '@/shared/types/role'

const ROLE_TONE: Record<Role, StatusTone> = {
  SUPER_ADMIN: 'error',
  ADMIN: 'info',
  TRAINER: 'warning',
  STUDENT: 'neutral',
}

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TRAINER: 'Trainer',
  STUDENT: 'Student',
}

export function RoleBadge({ role }: { role: Role }) {
  return <StatusBadge label={ROLE_LABEL[role]} tone={ROLE_TONE[role]} />
}
