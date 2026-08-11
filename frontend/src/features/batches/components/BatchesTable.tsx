import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Archive,
  Ban,
  CalendarClock,
  CheckCircle2,
  Copy,
  Layers,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { getCourse } from '@/features/courses/api/courses.api'
import { getTrainer } from '@/features/trainers/api/trainers.api'
import { BatchStatusBadge } from '@/features/batches/components/BatchStatusBadge'
import { DeliveryModeBadge } from '@/features/batches/components/DeliveryModeBadge'
import type { AdminBatchListItem } from '@/features/batches/types'

export interface BatchesTableActions {
  onView: (batch: AdminBatchListItem) => void
  onEdit: (batch: AdminBatchListItem) => void
  onDuplicate: (batch: AdminBatchListItem) => void
  onSchedule: (batch: AdminBatchListItem) => void
  onUnschedule: (batch: AdminBatchListItem) => void
  onActivate: (batch: AdminBatchListItem) => void
  onComplete: (batch: AdminBatchListItem) => void
  onCancel: (batch: AdminBatchListItem) => void
  onArchive: (batch: AdminBatchListItem) => void
  onRestore: (batch: AdminBatchListItem) => void
  onDelete: (batch: AdminBatchListItem) => void
}

interface BatchesTableProps extends BatchesTableActions {
  rows: readonly AdminBatchListItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

/**
 * Per-row course-title lookup — the list DTO only carries a raw `courseId`
 * (`features/batches/types/index.ts`). Reuses `getCourse` via React Query
 * so repeated course ids across rows share one cached fetch rather than
 * duplicating a course list/search implementation just for a table cell.
 */
function CourseCell({ courseId }: { courseId: string }) {
  const courseQuery = useQuery({
    queryKey: ['courses', 'detail-lite', courseId],
    queryFn: () => getCourse(courseId),
    staleTime: 5 * 60 * 1000,
  })

  if (courseQuery.isLoading) {
    return <span className="text-body-sm text-muted-foreground">Loading…</span>
  }
  if (!courseQuery.data) {
    return (
      <span className="text-body-sm text-muted-foreground font-mono" title={courseId}>
        {courseId.slice(0, 10)}…
      </span>
    )
  }
  return <span className="text-body-sm">{courseQuery.data.title}</span>
}

/** Mirrors `CourseCell` for the primary trainer's display name. */
function TrainerCell({ trainerId }: { trainerId: string | null }) {
  const trainerQuery = useQuery({
    queryKey: ['trainers', 'detail-lite', trainerId],
    queryFn: () => getTrainer(trainerId ?? ''),
    enabled: trainerId !== null,
    staleTime: 5 * 60 * 1000,
  })

  if (!trainerId) {
    return <span className="text-body-sm text-muted-foreground">Unassigned</span>
  }
  if (trainerQuery.isLoading) {
    return <span className="text-body-sm text-muted-foreground">Loading…</span>
  }
  if (!trainerQuery.data) {
    return <span className="text-body-sm text-muted-foreground">Unassigned</span>
  }
  return (
    <span className="text-body-sm">
      {trainerQuery.data.firstName} {trainerQuery.data.lastName}
    </span>
  )
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return 'Not set'
  const start = startDate ? format(new Date(startDate), 'MMM d, yyyy') : '—'
  const end = endDate ? format(new Date(endDate), 'MMM d, yyyy') : '—'
  return `${start} – ${end}`
}

export function BatchesTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onView,
  onEdit,
  onDuplicate,
  onSchedule,
  onUnschedule,
  onActivate,
  onComplete,
  onCancel,
  onArchive,
  onRestore,
  onDelete,
}: BatchesTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminBatchListItem>[] = [
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
          aria-label={`Select ${row.name}`}
        />
      ),
    },
    {
      id: 'batch',
      header: 'Batch',
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            onView(row)
          }}
          className="flex items-center gap-3 text-left"
        >
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <Layers className="text-muted-foreground size-4" />
          </div>
          <span>
            <span className="text-body-sm hover:text-primary-foreground/80 block font-medium hover:underline">
              {row.name}
            </span>
            <span className="text-caption text-muted-foreground block font-mono">
              {row.batchCode}
            </span>
          </span>
        </button>
      ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => <CourseCell courseId={row.courseId} />,
    },
    {
      id: 'dates',
      header: 'Dates',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDateRange(row.startDate, row.endDate)}
        </span>
      ),
    },
    {
      id: 'trainer',
      header: 'Primary Trainer',
      cell: (row) => <TrainerCell trainerId={row.primaryTrainerId} />,
    },
    {
      id: 'delivery',
      header: 'Delivery',
      cell: (row) => <DeliveryModeBadge deliveryMode={row.deliveryMode} />,
    },
    {
      id: 'capacity',
      header: 'Capacity',
      cell: (row) => (
        <span className="text-body-sm">
          {row.occupiedSeats} / {row.maxStudents}
          <span className="text-muted-foreground"> seats</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <BatchStatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.name}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.isDeleted ? (
              <DropdownMenuItem
                onSelect={() => {
                  onRestore(row)
                }}
              >
                <RotateCcw />
                Restore
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onSelect={() => {
                    onView(row)
                  }}
                >
                  <Layers />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    onEdit(row)
                  }}
                >
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    onDuplicate(row)
                  }}
                >
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {row.status === 'DRAFT' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onSchedule(row)
                    }}
                  >
                    <CalendarClock />
                    Schedule batch
                  </DropdownMenuItem>
                )}
                {row.status === 'SCHEDULED' && (
                  <>
                    <DropdownMenuItem
                      onSelect={() => {
                        onActivate(row)
                      }}
                    >
                      <PlayCircle />
                      Activate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        onUnschedule(row)
                      }}
                    >
                      <Undo2 />
                      Return to draft
                    </DropdownMenuItem>
                  </>
                )}
                {row.status === 'ACTIVE' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onComplete(row)
                    }}
                  >
                    <CheckCircle2 />
                    Complete
                  </DropdownMenuItem>
                )}
                {(row.status === 'DRAFT' ||
                  row.status === 'SCHEDULED' ||
                  row.status === 'ACTIVE') && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      onCancel(row)
                    }}
                  >
                    <Ban />
                    Cancel
                  </DropdownMenuItem>
                )}
                {(row.status === 'COMPLETED' || row.status === 'CANCELLED') && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onArchive(row)
                    }}
                  >
                    <Archive />
                    Archive
                  </DropdownMenuItem>
                )}
                {row.status === 'ARCHIVED' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onRestore(row)
                    }}
                  >
                    <RotateCcw />
                    Restore
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    onDelete(row)
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
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
        emptyIcon={Layers}
        emptyTitle="No batches found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
