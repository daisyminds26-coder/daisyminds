import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { QuestionsFilterBar } from '@/features/question-bank/components/QuestionsFilterBar'
import { QuestionsTable } from '@/features/question-bank/components/QuestionsTable'
import { useQuestionsList } from '@/features/question-bank/hooks/use-questions-list'
import type {
  ListQuestionsParams,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '@/features/question-bank/types'

export default function QuestionBankPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType | undefined>(undefined)
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | undefined>(undefined)
  const [status, setStatus] = useState<QuestionStatus | undefined>(undefined)

  const params: ListQuestionsParams = useMemo(
    () => ({ page, limit: 20, questionType, difficulty, status, search: search || undefined }),
    [page, questionType, difficulty, status, search],
  )
  const questionsQuery = useQuestionsList(params)

  return (
    <PageContainer
      title="Question Bank"
      description="A reusable pool of questions, drawn from when authoring a quiz or examination."
      actions={
        <Link
          to="/admin/question-bank/new"
          className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
        >
          <Plus className="size-4" />
          Add Question
        </Link>
      }
    >
      <DataGrid
        toolbar={
          <QuestionsFilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            questionType={questionType}
            onQuestionTypeChange={(value) => {
              setQuestionType(value)
              setPage(1)
            }}
            difficulty={difficulty}
            onDifficultyChange={(value) => {
              setDifficulty(value)
              setPage(1)
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          />
        }
        pagination={
          questionsQuery.data
            ? { meta: questionsQuery.data.meta, onPageChange: setPage }
            : undefined
        }
      >
        <QuestionsTable
          rows={questionsQuery.data?.data ?? []}
          isLoading={questionsQuery.isLoading}
          errorMessage={
            questionsQuery.isError ? getSafeErrorMessage(questionsQuery.error) : undefined
          }
          onRetry={() => void questionsQuery.refetch()}
        />
      </DataGrid>
    </PageContainer>
  )
}
