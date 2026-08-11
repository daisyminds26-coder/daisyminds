import { Progress } from '@/shared/components/ui/progress'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import type { BatchCapacitySnapshot } from '@/features/batches/types'

interface BatchCapacityWidgetProps {
  capacity: BatchCapacitySnapshot | undefined
  isLoading: boolean
}

/** Polished capacity summary — real `occupiedSeats`/`maxStudents` only, never a fabricated figure. Handles `maxStudents <= 0` safely (no divide-by-zero, no misleading 100%/NaN). */
export function BatchCapacityWidget({ capacity, isLoading }: BatchCapacityWidgetProps) {
  if (isLoading || !capacity) {
    return <ListSkeleton rows={2} />
  }

  const { maxStudents, occupiedSeats, availableSeats, waitlistCount } = capacity
  const utilization =
    maxStudents > 0 ? Math.min(100, Math.round((occupiedSeats / maxStudents) * 100)) : 0

  return (
    <div className="border-border flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <p className="text-h3 font-semibold">
          {occupiedSeats} / {maxStudents} Seats Occupied
        </p>
        <Progress
          value={utilization}
          aria-label={`${occupiedSeats.toString()} of ${maxStudents.toString()} seats occupied, ${utilization.toString()}% utilization`}
          className="mt-2"
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-h2 font-semibold">{availableSeats}</p>
          <p className="text-caption text-muted-foreground">Available</p>
        </div>
        <div>
          <p className="text-h2 font-semibold">{waitlistCount}</p>
          <p className="text-caption text-muted-foreground">Waitlist</p>
        </div>
        <div>
          <p className="text-h2 font-semibold">{utilization}%</p>
          <p className="text-caption text-muted-foreground">Utilization</p>
        </div>
      </div>
    </div>
  )
}
