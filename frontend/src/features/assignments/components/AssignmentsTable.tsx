import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Button } from '@/shared/components/ui/button'
import { AssignmentStatusBadge } from '@/features/assignments/components/AssignmentStatusBadge'
import type { AdminAssignment } from '@/features/assignments/types'

function formatDueDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface AssignmentsTableProps {
  rows: AdminAssignment[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  detailBasePath?: string
}

export function AssignmentsTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  detailBasePath = '/admin/assignments',
}: AssignmentsTableProps) {
  const columns: DataTableColumn<AdminAssignment>[] = [
    {
      id: 'title',
      header: 'Assignment',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm font-medium">{row.title}</span>
          <span className="text-caption text-muted-foreground">{row.assignmentCode}</span>
        </div>
      ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm">{row.courseTitle}</span>
          <span className="text-caption text-muted-foreground">
            {row.batches.map((batch) => batch.name).join(', ') || '—'}
          </span>
        </div>
      ),
    },
    {
      id: 'due',
      header: 'Due',
      cell: (row) => formatDueDate(row.dueDateTime, row.timezone),
    },
    {
      id: 'submissions',
      header: 'Submissions',
      cell: (row) => (
        <span>
          {row.submittedCount} submitted · {row.pendingGradingCount} to grade
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <AssignmentStatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link to={`${detailBasePath}/${row.id}`}>Manage</Link>
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
      emptyIcon={ClipboardList}
      emptyTitle="No assignments found"
      emptyDescription="Create an assignment to get started."
    />
  )
}
