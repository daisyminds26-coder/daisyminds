import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import type { QuestionStatus } from '@/features/question-bank/types'

const STATUS_TONE: Record<QuestionStatus, StatusTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ARCHIVED: 'neutral',
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}
