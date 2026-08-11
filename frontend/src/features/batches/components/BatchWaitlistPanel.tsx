import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Clock } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useBatchWaitlist } from '@/features/batches/hooks/use-batch-waitlist'
import {
  usePromoteWaitlist,
  useCancelEnrollment,
} from '@/features/enrollments/hooks/use-enrollment-lifecycle'
import type { WaitlistEntry } from '@/features/batches/types'

/** Focused waitlist queue for one batch — Promote/Cancel only, no auto-promotion. Reuses the same enrollment lifecycle mutations the enrolments list/detail pages use, never a parallel implementation. */
export function BatchWaitlistPanel({ batchId }: { batchId: string }) {
  const waitlistQuery = useBatchWaitlist(batchId)
  const promoteWaitlist = usePromoteWaitlist()
  const cancelEnrollment = useCancelEnrollment()
  const [pendingCancel, setPendingCancel] = useState<WaitlistEntry | null>(null)

  if (waitlistQuery.isLoading) return <ListSkeleton rows={3} />
  if (waitlistQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(waitlistQuery.error)}
        onRetry={() => void waitlistQuery.refetch()}
      />
    )
  }

  const entries = waitlistQuery.data ?? []
  if (entries.length === 0) {
    return <EmptyState icon={Clock} title="No students on the waitlist" />
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <span className="bg-accent text-caption flex size-7 shrink-0 items-center justify-center rounded-full font-semibold">
              #{entry.waitlistPosition ?? '—'}
            </span>
            <span>
              <span className="text-body-sm block font-medium">{entry.studentName}</span>
              <span className="text-caption text-muted-foreground block font-mono">
                {entry.enrollmentCode}
                {entry.waitlistedAt
                  ? ` · Waitlisted ${formatDistanceToNow(new Date(entry.waitlistedAt), { addSuffix: true })}`
                  : ''}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={promoteWaitlist.isPending}
              onClick={() => {
                promoteWaitlist.mutate(
                  { id: entry.id, batchId },
                  {
                    onSuccess: () => toast.success('Student promoted from waitlist'),
                    onError: (error) =>
                      toast.error('Could not promote from waitlist', getSafeErrorMessage(error)),
                  },
                )
              }}
            >
              Promote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setPendingCancel(entry)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null)
        }}
        title="Cancel this waitlisted enrolment?"
        description={
          pendingCancel
            ? `"${pendingCancel.enrollmentCode}" will be marked Cancelled and removed from the waitlist.`
            : ''
        }
        tone="destructive"
        confirmLabel="Cancel enrolment"
        isConfirming={cancelEnrollment.isPending}
        onConfirm={() => {
          if (!pendingCancel) return
          cancelEnrollment.mutate(
            { id: pendingCancel.id, batchId, payload: {} },
            {
              onSuccess: () => {
                toast.success('Enrolment cancelled')
                setPendingCancel(null)
              },
              onError: (error) => {
                toast.error('Could not cancel enrolment', getSafeErrorMessage(error))
                setPendingCancel(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
