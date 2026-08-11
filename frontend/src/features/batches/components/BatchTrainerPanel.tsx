import { useQueries, useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getTrainer } from '@/features/trainers/api/trainers.api'
import { useBatchConflicts } from '@/features/batches/hooks/use-batch-conflicts'
import type { AvailabilityStatus } from '@/features/trainers/types'

const AVAILABILITY_TONE: Record<AvailabilityStatus, StatusTone> = {
  AVAILABLE: 'success',
  LIMITED: 'warning',
  UNAVAILABLE: 'error',
}

interface BatchTrainerPanelProps {
  batchId: string
  primaryTrainerId: string | null
  assistantTrainerIds: string[]
}

/** Primary + assistant trainer summary and timetable-compatibility status — renders backend-computed conflicts as-is, never re-derives scheduling logic (same rule `ConflictsPanel` follows). */
export function BatchTrainerPanel({
  batchId,
  primaryTrainerId,
  assistantTrainerIds,
}: BatchTrainerPanelProps) {
  const primaryQuery = useQuery({
    queryKey: ['trainers', 'detail-lite', primaryTrainerId],
    queryFn: () => getTrainer(primaryTrainerId ?? ''),
    enabled: primaryTrainerId !== null,
  })
  const assistantQueries = useQueries({
    queries: assistantTrainerIds.map((trainerId) => ({
      queryKey: ['trainers', 'detail-lite', trainerId],
      queryFn: () => getTrainer(trainerId),
    })),
  })
  const conflictsQuery = useBatchConflicts(batchId)
  const hasConflict = (conflictsQuery.data?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-body-sm mb-2 font-medium">Primary trainer</p>
        {!primaryTrainerId ? (
          <p className="text-body-sm text-muted-foreground">No primary trainer assigned</p>
        ) : primaryQuery.isLoading ? (
          <ListSkeleton rows={1} />
        ) : primaryQuery.data ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage src={primaryQuery.data.profilePhotoUrl ?? undefined} alt="" />
              <AvatarFallback>{primaryQuery.data.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-body-sm font-medium">
                {primaryQuery.data.firstName} {primaryQuery.data.lastName}
              </p>
              <p className="text-caption text-muted-foreground font-mono">
                {primaryQuery.data.trainerId}
                {primaryQuery.data.designation ? ` · ${primaryQuery.data.designation}` : ''}
              </p>
              {primaryQuery.data.expertiseAreas.length > 0 && (
                <p className="text-caption text-muted-foreground">
                  {primaryQuery.data.expertiseAreas.join(', ')}
                </p>
              )}
              <StatusBadge
                label={primaryQuery.data.availabilityStatus}
                tone={AVAILABILITY_TONE[primaryQuery.data.availabilityStatus]}
                className="mt-1 w-fit"
              />
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">Unassigned</p>
        )}
      </div>

      <div>
        <p className="text-body-sm mb-2 font-medium">Assistant trainers</p>
        {assistantTrainerIds.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">None assigned</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {assistantQueries.map((query, index) => (
              <li key={assistantTrainerIds[index]} className="text-body-sm flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage src={query.data?.profilePhotoUrl ?? undefined} alt="" />
                  <AvatarFallback>{query.data?.firstName.charAt(0) ?? '…'}</AvatarFallback>
                </Avatar>
                {query.data ? `${query.data.firstName} ${query.data.lastName}` : 'Loading…'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-body-sm mb-2 font-medium">Timetable compatibility</p>
        {conflictsQuery.isLoading ? (
          <ListSkeleton rows={1} />
        ) : hasConflict ? (
          <div className="text-destructive flex items-center gap-2">
            <XCircle className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-body-sm">Conflict detected</span>
          </div>
        ) : (
          <div className="text-success flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-body-sm">Available</span>
          </div>
        )}
      </div>
    </div>
  )
}
