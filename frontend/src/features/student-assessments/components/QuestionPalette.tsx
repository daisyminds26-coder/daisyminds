import { Flag } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import type { AttemptQuestion } from '@/features/assessments/types'

function isAnswered(question: AttemptQuestion): boolean {
  return (
    question.selectedOptionIds.length > 0 ||
    question.booleanAnswer !== null ||
    question.numericAnswer !== null ||
    Boolean(question.textAnswer?.trim())
  )
}

interface QuestionPaletteProps {
  questions: AttemptQuestion[]
  currentIndex: number
  onSelect: (index: number) => void
}

/** Accessible question numbering with an answered/unanswered/flagged indicator that's never color-only — every state also carries text (`aria-label`) and, for flagged, a visible icon. */
export function QuestionPalette({ questions, currentIndex, onSelect }: QuestionPaletteProps) {
  return (
    <div
      role="navigation"
      aria-label="Question palette"
      className="grid grid-cols-5 gap-2 sm:grid-cols-4"
    >
      {questions.map((question, index) => {
        const answered = isAnswered(question)
        const isCurrent = index === currentIndex
        const status = answered ? 'answered' : 'unanswered'
        return (
          <button
            key={question.questionId}
            type="button"
            onClick={() => {
              onSelect(index)
            }}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={`Question ${String(index + 1)}, ${status}${question.flaggedForReview ? ', flagged for review' : ''}`}
            className={cn(
              'relative flex size-10 items-center justify-center rounded-md border text-sm font-medium',
              isCurrent && 'border-primary ring-primary ring-2',
              !isCurrent && answered && 'border-success/40 bg-success/10 text-success',
              !isCurrent && !answered && 'border-border bg-background text-muted-foreground',
            )}
          >
            {index + 1}
            {question.flaggedForReview && (
              <Flag
                className="text-warning absolute -top-1.5 -right-1.5 size-3.5 fill-current"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
