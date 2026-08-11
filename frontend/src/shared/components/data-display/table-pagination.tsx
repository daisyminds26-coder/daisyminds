import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

/** Mirrors API-STANDARDS.md §4's list-endpoint `meta` shape. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface TablePaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

/**
 * Callback-driven (not `<a href>`-based) since page changes here will
 * eventually re-trigger a TanStack Query fetch rather than navigate to a
 * new URL — matches how `meta.page`/`meta.totalPages` are consumed once
 * list endpoints are wired up.
 */
export function TablePagination({ meta, onPageChange }: TablePaginationProps) {
  const { page, limit, total, totalPages } = meta
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1
  const rangeEnd = Math.min(page * limit, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-body-sm text-muted-foreground">
        Showing <span className="text-foreground font-medium">{rangeStart}</span>–
        <span className="text-foreground font-medium">{rangeEnd}</span> of{' '}
        <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1)
          }}
          className="gap-1"
        >
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <span className="text-body-sm text-muted-foreground px-2">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => {
            onPageChange(page + 1)
          }}
          className="gap-1"
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
