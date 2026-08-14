import { Badge } from '@/shared/components/ui/badge'
import type { QuestionType } from '@/features/question-bank/types'

const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
  LONG_ANSWER: 'Long answer',
  FILL_IN_THE_BLANK: 'Fill in the blank',
  NUMERIC: 'Numeric',
}

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  return <Badge variant="outline">{TYPE_LABEL[type]}</Badge>
}

export { TYPE_LABEL as QUESTION_TYPE_LABEL }
