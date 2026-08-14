import { CalendarClock, FileEdit, Layers, PlayCircle } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useBatchStats } from '@/features/batches/hooks/use-batch-stats'

/**
 * Deliberately never a students/Enrolllled/available-seats/waitlist count card
 * — the batch DTO has no Enrolllled-count field (`AdminBatch` — capacity is
 * configuration only, see `features/batches/types/index.ts`).
 */
export function BatchStatCards() {
  const stats = useBatchStats()

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Batches" value={stats.total} icon={Layers} />
      <StatCard label="Scheduled" value={stats.scheduled} icon={CalendarClock} />
      <StatCard label="Active" value={stats.active} icon={PlayCircle} />
      <StatCard label="Draft" value={stats.draft} icon={FileEdit} />
    </div>
  )
}
