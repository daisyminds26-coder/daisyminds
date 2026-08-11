import { Link } from 'react-router-dom'
import { CalendarX2, CheckCircle2, UserX } from 'lucide-react'

import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import type { TrainerConflict } from '@/features/batches/types'

interface ConflictsPanelProps {
  conflicts: TrainerConflict[] | undefined
  isLoading: boolean
}

/**
 * Renders backend-computed trainer conflicts as-is (never re-derives
 * scheduling logic client-side). AVAILABILITY conflicts (trainer's own
 * declared unavailability) and CROSS_BATCH conflicts (double-booked against
 * another batch's weekly schedule) get distinct icons/labels so the two
 * causes aren't visually conflated. A `conflictingBatchId` links only to the
 * internal batch detail route — nothing beyond what the API already
 * returned is exposed.
 */
export function ConflictsPanel({ conflicts, isLoading }: ConflictsPanelProps) {
  if (isLoading || !conflicts) {
    return <ListSkeleton rows={2} />
  }

  if (conflicts.length === 0) {
    return (
      <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
        <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
        <p className="text-body-sm font-medium">No trainer conflicts detected</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {conflicts.map((conflict, index) => (
        <li
          key={`${conflict.trainerId}-${index.toString()}`}
          className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3"
        >
          {conflict.type === 'AVAILABILITY' ? (
            <UserX className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CalendarX2 className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-caption text-muted-foreground font-medium">
              {conflict.type === 'AVAILABILITY' ? 'Availability conflict' : 'Cross-batch conflict'}
            </p>
            <p className="text-body-sm">{conflict.message}</p>
            {conflict.conflictingBatchId && (
              <Link
                to={`/admin/batches/${conflict.conflictingBatchId}`}
                className="text-caption text-primary hover:underline"
              >
                View conflicting batch
                {conflict.conflictingBatchCode ? ` (${conflict.conflictingBatchCode})` : ''}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
