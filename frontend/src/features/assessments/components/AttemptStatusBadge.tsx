import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { AssessmentAttemptStatus, PassStatus } from '@/features/assessments/types'

const STATUS_TONE: Record<AssessmentAttemptStatus, StatusTone> = {
  IN_PROGRESS: 'info',
  PENDING_MANUAL_GRADING: 'warning',
  GRADED: 'success',
  INVALIDATED: 'error',
}

const STATUS_LABEL: Record<AssessmentAttemptStatus, string> = {
  IN_PROGRESS: 'In progress',
  PENDING_MANUAL_GRADING: 'Pending grading',
  GRADED: 'Graded',
  INVALIDATED: 'Invalidated',
}

export function AttemptStatusBadge({ status }: { status: AssessmentAttemptStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}

const PASS_STATUS_TONE: Record<PassStatus, StatusTone> = {
  PASS: 'success',
  FAIL: 'error',
  NOT_APPLICABLE: 'neutral',
}

const PASS_STATUS_LABEL: Record<PassStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NOT_APPLICABLE: 'N/A',
}

export function PassStatusBadge({ status }: { status: PassStatus }) {
  return <StatusBadge label={PASS_STATUS_LABEL[status]} tone={PASS_STATUS_TONE[status]} />
}
