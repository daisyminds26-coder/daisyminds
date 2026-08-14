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
import {
  AttemptStatusBadge,
  PassStatusBadge,
} from '@/features/assessments/components/AttemptStatusBadge'
import type { AttemptSummary, ListAttemptsParams } from '@/features/assessments/types'

interface AttemptsPanelProps {
  attempts: AttemptSummary[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  filter: ListAttemptsParams
  onFilterChange: (filter: ListAttemptsParams) => void
  onSelect: (attempt: AttemptSummary) => void
}

/** One roster: the latest attempt per student. Shared by the admin and trainer grading surfaces, mirroring `SubmissionsPanel`'s own shape from the Assignments module. */
export function AttemptsPanel({
  attempts,
  isLoading,
  errorMessage,
  onRetry,
  filter,
  onFilterChange,
  onSelect,
}: AttemptsPanelProps) {
  const columns: DataTableColumn<AttemptSummary>[] = [
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
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <AttemptStatusBadge status={row.status} />
          {row.pendingManualCount > 0 && (
            <span className="text-caption text-muted-foreground">
              {row.pendingManualCount} question(s) to grade
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'marks',
      header: 'Marks',
      cell: (row) =>
        row.totalMarksAwarded === null
          ? '—'
          : `${String(row.totalMarksAwarded)} (${String(row.percentage)}%)`,
    },
    {
      id: 'result',
      header: 'Result',
      cell: (row) => (row.passStatus ? <PassStatusBadge status={row.passStatus} /> : '—'),
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
        <Select
          value={filter.status ?? 'all'}
          onValueChange={(value) => {
            onFilterChange({
              ...filter,
              status: value === 'all' ? undefined : (value as ListAttemptsParams['status']),
            })
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="PENDING_MANUAL_GRADING">Pending grading</SelectItem>
            <SelectItem value="GRADED">Graded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={attempts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyIcon={Users}
        emptyTitle="No attempts yet"
        emptyDescription="Attempts will appear here once students start the assessment."
      />
    </div>
  )
}
