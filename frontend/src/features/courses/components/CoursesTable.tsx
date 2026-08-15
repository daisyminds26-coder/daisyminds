import { formatEnumLabel } from '@/shared/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import {
  Archive,
  BookOpen,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
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
import { CourseStatusBadge } from '@/features/courses/components/CourseStatusBadge'
import type { AdminCourseListItem } from '@/features/courses/types'

export interface CoursesTableActions {
  onView: (course: AdminCourseListItem) => void
  onEdit: (course: AdminCourseListItem) => void
  onPublish: (course: AdminCourseListItem) => void
  onUnpublish: (course: AdminCourseListItem) => void
  onArchive: (course: AdminCourseListItem) => void
  onRestore: (course: AdminCourseListItem) => void
  onDelete: (course: AdminCourseListItem) => void
}

interface CoursesTableProps extends CoursesTableActions {
  rows: readonly AdminCourseListItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

function formatPrice(row: AdminCourseListItem): string {
  if (row.pricing.pricingType === 'FREE') return 'Free'
  return `${row.pricing.currency} ${row.pricing.displayPrice.toLocaleString()}`
}

export function CoursesTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onView,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  onDelete,
}: CoursesTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminCourseListItem>[] = [
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
          aria-label={`Select ${row.title}`}
        />
      ),
    },
    {
      id: 'course',
      header: 'Course',
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            onView(row)
          }}
          className="flex items-center gap-3 text-left"
        >
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
            {row.thumbnailUrl ? (
              <img src={row.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : (
              <BookOpen className="text-muted-foreground size-4" />
            )}
          </div>
          <span>
            <span className="text-body-sm hover:text-primary-foreground/80 block font-medium hover:underline">
              {row.title}
            </span>
            <span className="text-caption text-muted-foreground block font-mono">
              {row.courseCode}
            </span>
          </span>
        </button>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: (row) => <span className="text-body-sm text-muted-foreground">{row.category}</span>,
    },
    {
      id: 'level',
      header: 'Level',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">{formatEnumLabel(row.level)}</span>
      ),
    },
    {
      id: 'deliveryMode',
      header: 'Delivery',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatEnumLabel(row.deliveryMode)}
        </span>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      cell: (row) => <span className="text-body-sm">{formatPrice(row)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <CourseStatusBadge status={row.status} />,
    },
    {
      id: 'updatedAt',
      header: 'Updated',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
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
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.title}`}>
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
                    onEdit(row)
                  }}
                >
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {row.status === 'DRAFT' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onPublish(row)
                    }}
                  >
                    <Send />
                    Publish
                  </DropdownMenuItem>
                )}
                {row.status === 'PUBLISHED' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onUnpublish(row)
                    }}
                  >
                    <Undo2 />
                    Move to draft
                  </DropdownMenuItem>
                )}
                {row.status === 'ARCHIVED' ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      onRestore(row)
                    }}
                  >
                    <RotateCcw />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => {
                      onArchive(row)
                    }}
                  >
                    <Archive />
                    Archive
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
        emptyIcon={BookOpen}
        emptyTitle="No courses found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
