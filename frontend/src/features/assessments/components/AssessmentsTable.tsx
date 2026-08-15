import { FileQuestion, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { AssessmentStatusBadge } from '@/features/assessments/components/AssessmentStatusBadge'
import type { AdminAssessment } from '@/features/assessments/types'

interface AssessmentsTableProps {
  rows: AdminAssessment[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  detailBasePath?: string
}

export function AssessmentsTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  detailBasePath = '/admin/assessments',
}: AssessmentsTableProps) {
  const columns: DataTableColumn<AdminAssessment>[] = [
    {
      id: 'title',
      header: 'Assessment',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm font-medium">{row.title}</span>
          <span className="text-caption text-muted-foreground">{row.assessmentCode}</span>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge variant="outline">{row.assessmentType === 'QUIZ' ? 'Quiz' : 'Exam'}</Badge>
      ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => {
        const batchNames = row.batches.map((batch) => batch.name).join(', ') || '—'
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-sm">{row.courseTitle}</span>
            <span
              title={batchNames}
              className="text-caption text-muted-foreground block max-w-[20ch] truncate"
            >
              {batchNames}
            </span>
          </div>
        )
      },
    },
    {
      id: 'questions',
      header: 'Questions',
      cell: (row) => `${String(row.questionCount)} · ${String(row.totalMarks)} marks`,
    },
    {
      id: 'attempts',
      header: 'Attempts',
      cell: (row) => (
        <span>
          {row.attemptCounts.totalAttempts} total · {row.attemptCounts.pendingGrading} to grade
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <AssessmentStatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (row) => (
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Manage ${row.assessmentCode}`}>
          <Link to={`${detailBasePath}/${row.id}`} title="Manage">
            <Pencil className="size-4" />
          </Link>
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
      emptyIcon={FileQuestion}
      emptyTitle="No assessments found"
      emptyDescription="Create a quiz or examination to get started."
    />
  )
}
