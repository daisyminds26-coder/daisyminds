import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import {
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionStatus,
  type QuestionType,
} from '@/features/question-bank/types'
import { QUESTION_TYPE_LABEL } from '@/features/question-bank/components/QuestionTypeBadge'

interface QuestionsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  questionType: QuestionType | undefined
  onQuestionTypeChange: (value: QuestionType | undefined) => void
  difficulty: QuestionDifficulty | undefined
  onDifficultyChange: (value: QuestionDifficulty | undefined) => void
  status: QuestionStatus | undefined
  onStatusChange: (value: QuestionStatus | undefined) => void
}

export function QuestionsFilterBar({
  search,
  onSearchChange,
  questionType,
  onQuestionTypeChange,
  difficulty,
  onDifficultyChange,
  status,
  onStatusChange,
}: QuestionsFilterBarProps) {
  const filters: FilterDef[] = [
    {
      id: 'questionType',
      label: 'Type',
      value: questionType,
      onChange: (value) => {
        onQuestionTypeChange(value as QuestionType | undefined)
      },
      options: QUESTION_TYPES.map((value) => ({ value, label: QUESTION_TYPE_LABEL[value] })),
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      value: difficulty,
      onChange: (value) => {
        onDifficultyChange(value as QuestionDifficulty | undefined)
      },
      options: QUESTION_DIFFICULTIES.map((value) => ({ value, label: value })),
    },
    {
      id: 'status',
      label: 'Status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as QuestionStatus | undefined)
      },
      options: QUESTION_STATUSES.map((value) => ({ value, label: value })),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by question text, question code…"
        className="sm:max-w-md sm:flex-1"
      />
      <FilterBar
        filters={filters}
        onClearAll={() => {
          onQuestionTypeChange(undefined)
          onDifficultyChange(undefined)
          onStatusChange(undefined)
        }}
      />
    </div>
  )
}
