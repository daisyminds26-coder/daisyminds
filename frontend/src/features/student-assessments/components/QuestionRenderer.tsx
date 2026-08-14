import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import type { AnswerEntryPayload } from '@/features/student-assessments/types'
import type { AttemptQuestion } from '@/features/assessments/types'

interface QuestionRendererProps {
  question: AttemptQuestion
  disabled?: boolean
  onAnswerChange: (patch: Partial<AnswerEntryPayload>) => void
}

/**
 * One accessible input per question type — every choice question uses a
 * real `<fieldset>`/`<legend>` (UI-DESIGN-SYSTEM.md §9's explicit
 * requirement) and native radio/checkbox semantics so keyboard and
 * screen-reader navigation work without any bespoke ARIA wiring. Selected
 * state is never color-only — the selected option's border/background pair
 * with a checked control, never a bare colored dot.
 */
export function QuestionRenderer({ question, disabled, onAnswerChange }: QuestionRendererProps) {
  const questionId = question.questionId

  if (question.questionType === 'SINGLE_CHOICE') {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Select one option</legend>
        {question.options.map((option) => {
          const checked = question.selectedOptionIds.includes(option.id)
          return (
            <label
              key={option.id}
              className={cn(
                'border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm',
                checked && 'border-primary bg-primary/5',
              )}
            >
              <input
                type="radio"
                name={`question-${questionId}`}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  onAnswerChange({ selectedOptionIds: [option.id] })
                }}
                className="accent-primary size-4"
              />
              {option.text}
            </label>
          )
        })}
      </fieldset>
    )
  }

  if (question.questionType === 'MULTIPLE_CHOICE') {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Select all that apply</legend>
        {question.options.map((option) => {
          const checked = question.selectedOptionIds.includes(option.id)
          return (
            <label
              key={option.id}
              className={cn(
                'border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm',
                checked && 'border-primary bg-primary/5',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => {
                  const next = value
                    ? [...question.selectedOptionIds, option.id]
                    : question.selectedOptionIds.filter((id) => id !== option.id)
                  onAnswerChange({ selectedOptionIds: next })
                }}
              />
              {option.text}
            </label>
          )
        })}
      </fieldset>
    )
  }

  if (question.questionType === 'TRUE_FALSE') {
    return (
      <fieldset className="flex gap-3">
        <legend className="sr-only">Select True or False</legend>
        {[true, false].map((value) => {
          const checked = question.booleanAnswer === value
          return (
            <label
              key={String(value)}
              className={cn(
                'border-border flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium',
                checked && 'border-primary bg-primary/5',
              )}
            >
              <input
                type="radio"
                name={`question-${questionId}`}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  onAnswerChange({ booleanAnswer: value })
                }}
                className="accent-primary size-4"
              />
              {value ? 'True' : 'False'}
            </label>
          )
        })}
      </fieldset>
    )
  }

  if (question.questionType === 'NUMERIC') {
    return (
      <Input
        type="number"
        disabled={disabled}
        value={question.numericAnswer ?? ''}
        onChange={(event) => {
          onAnswerChange({
            numericAnswer: event.target.value === '' ? undefined : Number(event.target.value),
          })
        }}
        aria-label="Your numeric answer"
        className="max-w-xs"
      />
    )
  }

  if (question.questionType === 'LONG_ANSWER') {
    return (
      <Textarea
        rows={6}
        disabled={disabled}
        value={question.textAnswer ?? ''}
        onChange={(event) => {
          onAnswerChange({ textAnswer: event.target.value })
        }}
        aria-label="Your answer"
        maxLength={20_000}
      />
    )
  }

  return (
    <Input
      type="text"
      disabled={disabled}
      value={question.textAnswer ?? ''}
      onChange={(event) => {
        onAnswerChange({ textAnswer: event.target.value })
      }}
      aria-label="Your answer"
      maxLength={2000}
    />
  )
}
