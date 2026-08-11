import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ListChecks, Pencil, Plus, Users } from 'lucide-react'

import { Button, buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCheckReadiness } from '@/features/batches/hooks/use-batch-readiness'
import { useExportEnrollments } from '@/features/enrollments/hooks/use-export-enrollments'
import { BulkEnrollDialog } from '@/features/enrollments/components/BulkEnrollDialog'
import type { AdminBatch } from '@/features/batches/types'

interface BatchQuickActionsProps {
  batch: AdminBatch
  onViewWaitlist: () => void
  onEditBatch: () => void
}

/**
 * Only real, already-implemented destinations/actions — no link to a
 * not-yet-built page (e.g. no standalone trainer/course detail route
 * exists yet, so those aren't offered here as separate quick actions).
 * "Export Roster" and "Export Enrollment CSV" from the task's own scope
 * are the same underlying call (`GET /enrollments/export?batchId=`) —
 * offered once, not duplicated as two buttons that would do the same
 * thing.
 */
export function BatchQuickActions({ batch, onViewWaitlist, onEditBatch }: BatchQuickActionsProps) {
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false)
  const checkReadiness = useCheckReadiness()
  const exportEnrollments = useExportEnrollments()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-medium">Quick actions</p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/admin/enrollments/new?batchId=${batch.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Plus className="size-3.5" />
          Enrol Student
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setBulkEnrollOpen(true)
          }}
        >
          <Users className="size-3.5" />
          Bulk Enrol
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onViewWaitlist}
        >
          <ListChecks className="size-3.5" />
          View Waitlist
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEditBatch}>
          <Pencil className="size-3.5" />
          Edit Batch
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={checkReadiness.isPending}
          onClick={() => {
            checkReadiness.mutate(batch.id, {
              onSuccess: (result) => {
                toast[result.ready ? 'success' : 'warning'](
                  result.ready
                    ? 'Batch is ready to schedule'
                    : `${result.blockers.length.toString()} readiness item(s) remaining`,
                )
              },
              onError: (error) =>
                toast.error('Could not check readiness', getSafeErrorMessage(error)),
            })
          }}
        >
          {checkReadiness.isPending ? 'Checking…' : 'Check Readiness'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exportEnrollments.isPending}
          onClick={() => {
            exportEnrollments.mutate({ batchId: batch.id })
          }}
        >
          <Download className="size-3.5" />
          Export Roster
        </Button>
        <Link
          to={`/admin/courses/${batch.courseId}/curriculum`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          View Course
        </Link>
      </div>

      <BulkEnrollDialog
        open={bulkEnrollOpen}
        onOpenChange={setBulkEnrollOpen}
        initialBatchId={batch.id}
      />
    </div>
  )
}
