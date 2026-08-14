import { Users } from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { SubmissionStatusBadge } from '@/features/assignments/components/SubmissionStatusBadge'
import type { AssignmentSubmission, ListSubmissionsParams } from '@/features/assignments/types'

interface SubmissionsPanelProps {
  submissions: AssignmentSubmission[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filter: ListSubmissionsParams
  onFilterChange: (filter: ListSubmissionsParams) => void
  onSelect: (submission: AssignmentSubmission) => void
}

/** One roster: the latest attempt per student. Shared by the admin and trainer grading surfaces — the caller owns data fetching (admin/trainer hit different API namespaces for the identical shape). */
export function SubmissionsPanel({
  submissions,
  isLoading,
  errorMessage,
  onRetry,
  filter,
  onFilterChange,
  onSelect,
}: SubmissionsPanelProps) {
  const columns: DataTableColumn<AssignmentSubmission>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm font-medium">{row.studentName}</span>
          <span className="text-caption text-muted-foreground font-mono">{row.studentCode}</span>
        </div>
      ),
    },
    { id: 'attempt', header: 'Attempt', cell: (row) => row.attemptNumber },
    {
      id: 'submittedAt',
      header: 'Submitted',
      cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'),
    },
    {
      id: 'late',
      header: 'On time',
      cell: (row) => (row.submittedLate ? 'Late' : 'On time'),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <SubmissionStatusBadge status={row.status} />,
    },
    {
      id: 'marks',
      header: 'Marks',
      cell: (row) =>
        row.marksAwarded === null
          ? '—'
          : `${String(row.marksAwarded)} (${String(row.percentage)}%)`,
    },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSelect(row)
          }}
        >
          Review
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox
          value={filter.search ?? ''}
          onChange={(value) => {
            onFilterChange({ ...filter, search: value || undefined })
          }}
          placeholder="Search student name or ID…"
          className="sm:max-w-sm"
        />
        <div className="flex gap-2">
          <Select
            value={filter.status ?? 'all'}
            onValueChange={(value) => {
              onFilterChange({
                ...filter,
                status: value === 'all' ? undefined : (value as 'SUBMITTED' | 'GRADED'),
              })
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="SUBMITTED">Ungraded</SelectItem>
              <SelectItem value="GRADED">Graded</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={filter.lateOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              onFilterChange({ ...filter, lateOnly: !filter.lateOnly })
            }}
          >
            Late only
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={submissions}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyIcon={Users}
        emptyTitle="No submissions yet"
        emptyDescription="Submissions will appear here once students start submitting."
      />
    </div>
  )
}
