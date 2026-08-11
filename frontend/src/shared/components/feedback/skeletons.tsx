import { Skeleton } from '@/shared/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'

/** Loading state for table/list views (UI-DESIGN-SYSTEM.md §8 — skeleton, not a bare spinner). */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading table data">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={columnIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-7 w-1/3" />
      </CardContent>
    </Card>
  )
}
