import { HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Button } from '@/shared/components/ui/button'
import { QuestionTypeBadge } from '@/features/question-bank/components/QuestionTypeBadge'
import { QuestionStatusBadge } from '@/features/question-bank/components/QuestionStatusBadge'
import type { AdminQuestion } from '@/features/question-bank/types'

interface QuestionsTableProps {
  rows: AdminQuestion[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
}

export function QuestionsTable({ rows, isLoading, errorMessage, onRetry }: QuestionsTableProps) {
  const columns: DataTableColumn<AdminQuestion>[] = [
    {
      id: 'question',
      header: 'Question',
      cell: (row) => (
        <div className="flex max-w-md flex-col gap-0.5">
          <span className="text-body-sm line-clamp-2 font-medium">{row.questionText}</span>
          <span className="text-caption text-muted-foreground">{row.questionCode}</span>
        </div>
      ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => <span className="text-body-sm">{row.courseTitle}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      cell: (row) => <QuestionTypeBadge type={row.questionType} />,
    },
    {
      id: 'difficulty',
      header: 'Difficulty',
      cell: (row) => row.difficulty ?? '—',
    },
    {
      id: 'marks',
      header: 'Marks',
      cell: (row) => row.marks,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <QuestionStatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/question-bank/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRetry={onRetry}
      emptyIcon={HelpCircle}
      emptyTitle="No questions found"
      emptyDescription="Add a question to start building the question bank."
    />
  )
}
