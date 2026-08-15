import { formatDistanceToNow } from 'date-fns'
import { GraduationCap, MoreHorizontal, Repeat2, UserCheck, XCircle } from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { EnrollmentStatusBadge } from '@/features/enrollments/components/EnrollmentStatusBadge'
import { AccessBadge } from '@/features/enrollments/components/AccessBadge'
import type { AdminEnrollmentListItem } from '@/features/enrollments/types'

export interface EnrollmentsTableActions {
  onView: (enrollment: AdminEnrollmentListItem) => void
  onPromote: (enrollment: AdminEnrollmentListItem) => void
  onTransfer: (enrollment: AdminEnrollmentListItem) => void
  onCancel: (enrollment: AdminEnrollmentListItem) => void
}

interface EnrollmentsTableProps extends EnrollmentsTableActions {
  rows: readonly AdminEnrollmentListItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'DROPPED'])
const TRANSFERABLE_STATUSES = new Set(['CONFIRMED', 'ACTIVE', 'SUSPENDED'])

export function EnrollmentsTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onView,
  onPromote,
  onTransfer,
  onCancel,
}: EnrollmentsTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminEnrollmentListItem>[] = [
    {
      id: 'select',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => {
            onToggleSelected(row.id)
          }}
          aria-label={`Select enrollment ${row.enrollmentCode}`}
        />
      ),
    },
    {
      id: 'enrollment',
      header: 'Enrollment',
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            onView(row)
          }}
          className="text-left"
        >
          <span className="text-body-sm hover:text-primary-foreground/80 block font-medium hover:underline">
            {row.enrollmentCode}
          </span>
          <span className="text-caption text-muted-foreground block">
            {new Date(row.enrollmentDate).toLocaleDateString()}
          </span>
        </button>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: (row) =>
        row.student ? (
          <span>
            <span className="text-body-sm block">{row.student.name}</span>
            <span className="text-caption text-muted-foreground block font-mono">
              {row.student.studentCode}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => <span className="text-body-sm">{row.course?.title ?? 'Unknown'}</span>,
    },
    {
      id: 'batch',
      header: 'Batch',
      cell: (row) => (
        <span className="min-w-0">
          <span
            title={row.batch?.name ?? undefined}
            className="text-body-sm block max-w-[20ch] truncate"
          >
            {row.batch?.name ?? 'Unknown'}
          </span>
          <span className="text-caption text-muted-foreground block font-mono">
            {row.batch?.batchCode}
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <EnrollmentStatusBadge status={row.status} />,
    },
    {
      id: 'access',
      header: 'Access',
      cell: (row) => <AccessBadge accessState={row.accessState} />,
    },
    {
      id: 'enrolledOn',
      header: 'Enrolled On',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for enrollment ${row.enrollmentCode}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                onView(row)
              }}
            >
              <GraduationCap />
              View details
            </DropdownMenuItem>
            {row.status === 'WAITLISTED' && (
              <DropdownMenuItem
                onSelect={() => {
                  onPromote(row)
                }}
              >
                <UserCheck />
                Promote from waitlist
              </DropdownMenuItem>
            )}
            {TRANSFERABLE_STATUSES.has(row.status) && (
              <DropdownMenuItem
                onSelect={() => {
                  onTransfer(row)
                }}
              >
                <Repeat2 />
                Transfer batch
              </DropdownMenuItem>
            )}
            {!TERMINAL_STATUSES.has(row.status) && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onCancel(row)
                }}
              >
                <XCircle />
                Cancel enrollment
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all"
          />
          <span className="text-caption text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size.toString()} selected` : 'Select all'}
          </span>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyIcon={GraduationCap}
        emptyTitle="No enrollments found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
