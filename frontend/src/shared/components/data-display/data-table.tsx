import type { ComponentType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { TableSkeleton } from '@/shared/components/feedback/skeletons'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'

export interface DataTableColumn<TRow> {
  id: string
  header: string
  cell: (row: TRow) => ReactNode
  className?: string
}

interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[]
  rows: readonly TRow[]
  getRowId: (row: TRow) => string
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  emptyIcon?: ComponentType<{ className?: string }>
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  className?: string
}

/**
 * Generic, presentational table: the caller supplies column defs and rows,
 * this handles the four required view states (UI-DESIGN-SYSTEM.md §8) and
 * responsiveness (horizontal scroll inside its own container so a wide
 * table never breaks the page layout on tablet/mobile).
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyIcon = Inbox,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<TRow>) {
  return (
    <div className={cn('border-border bg-card overflow-x-auto rounded-xl border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-4">
                <TableSkeleton columns={columns.length} />
              </TableCell>
            </TableRow>
          ) : errorMessage ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <ErrorState description={errorMessage} onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
