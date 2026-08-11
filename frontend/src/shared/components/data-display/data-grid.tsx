import type { ReactNode } from 'react'

import {
  TablePagination,
  type PaginationMeta,
} from '@/shared/components/data-display/table-pagination'

interface DataGridProps {
  toolbar?: ReactNode
  pagination?: {
    meta: PaginationMeta
    onPageChange: (page: number) => void
  }
  children: ReactNode
}

/**
 * Composite shell for a list screen: optional toolbar (search/filters/
 * actions — compose `SearchBox`/`FilterBar` into it), the table itself
 * (pass a `DataTable` as `children`), and an optional pagination footer.
 * Purely presentational — the caller owns data fetching and state.
 */
export function DataGrid({ toolbar, pagination, children }: DataGridProps) {
  return (
    <div className="flex flex-col gap-4">
      {toolbar && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          {toolbar}
        </div>
      )}
      {children}
      {pagination && (
        <TablePagination meta={pagination.meta} onPageChange={pagination.onPageChange} />
      )}
    </div>
  )
}
