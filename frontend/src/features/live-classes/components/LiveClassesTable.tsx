import { Video } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Button } from '@/shared/components/ui/button'
import { LiveClassStatusBadge } from '@/features/live-classes/components/LiveClassStatusBadge'
import type { AdminLiveClass } from '@/features/live-classes/types'

/** `Intl`-only formatting (no date-fns-tz dependency) — renders a session's stored UTC instant in its own recorded timezone, mirroring the backend's own round-trip technique. */
function formatSessionTime(startDateTime: string, timezone: string): string {
  const date = new Date(startDateTime)
  const datePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  return `${datePart}, ${timePart}`
}

interface LiveClassesTableProps {
  rows: AdminLiveClass[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  hideBatchColumn?: boolean
  detailBasePath?: string
}

export function LiveClassesTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  hideBatchColumn = false,
  detailBasePath = '/admin/live-classes',
}: LiveClassesTableProps) {
  const allColumns: DataTableColumn<AdminLiveClass>[] = [
    {
      id: 'session',
      header: 'Session',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm font-medium">{row.title}</span>
          <span className="text-caption text-muted-foreground">{row.sessionCode}</span>
        </div>
      ),
    },
    {
      id: 'batch',
      header: 'Batch / Course',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm">{row.batchName}</span>
          <span className="text-caption text-muted-foreground">{row.courseTitle}</span>
        </div>
      ),
    },
    {
      id: 'when',
      header: 'When',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm">{formatSessionTime(row.startDateTime, row.timezone)}</span>
          <span className="text-caption text-muted-foreground">
            {row.durationMinutes} min · {row.timezone}
          </span>
        </div>
      ),
    },
    {
      id: 'trainer',
      header: 'Trainer',
      cell: (row) => row.primaryTrainer?.name ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <LiveClassStatusBadge status={row.status} />,
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
  const columns = hideBatchColumn
    ? allColumns.filter((column) => column.id !== 'batch')
    : allColumns

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRetry={onRetry}
      emptyIcon={Video}
      emptyTitle="No live classes found"
      emptyDescription="Create a session manually or generate them from the batch's weekly timetable."
    />
  )
}
