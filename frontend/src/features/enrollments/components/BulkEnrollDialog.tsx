import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { getBatch } from '@/features/batches/api/batches.api'
import { BatchSelectorField } from '@/features/enrollments/components/BatchSelectorField'
import { StudentMultiSelectField } from '@/features/enrollments/components/StudentMultiSelectField'
import { useBulkEnroll } from '@/features/enrollments/hooks/use-bulk-enroll'
import {
  bulkEnrollSchema,
  type BulkEnrollFormValues,
} from '@/features/enrollments/schemas/enrollment.schemas'
import type { EnrollmentBulkResult } from '@/features/enrollments/types'

interface BulkEnrollDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-seeds the batch step from a deep link (e.g. the Batch Detail "Bulk Enrol" quick action) — still editable. */
  initialBatchId?: string
}

export function BulkEnrollDialog({ open, onOpenChange, initialBatchId }: BulkEnrollDialogProps) {
  const bulkEnroll = useBulkEnroll()
  const [result, setResult] = useState<EnrollmentBulkResult | null>(null)
  const form = useForm<BulkEnrollFormValues>({
    resolver: zodResolver(bulkEnrollSchema),
    defaultValues: { batchId: initialBatchId ?? '', studentIds: [] },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- see `CreateEnrollmentWizard.tsx`'s identical comment
  const batchId = form.watch('batchId')
  const studentIds = form.watch('studentIds')
  const batchQuery = useQuery({
    queryKey: ['batches', 'detail-lite', batchId],
    queryFn: () => getBatch(batchId),
    enabled: batchId !== '',
  })
  const batch = batchQuery.data
  const selectedCount = studentIds.length
  const expectedConfirmed = batch ? Math.min(selectedCount, batch.availableSeats) : 0
  const expectedWaitlisted = batch ? Math.max(0, selectedCount - batch.availableSeats) : 0

  function reset() {
    form.reset({ batchId: initialBatchId ?? '', studentIds: [] })
    setResult(null)
  }

  function onSubmit(values: BulkEnrollFormValues) {
    bulkEnroll.mutate(
      { batchId: values.batchId, studentIds: values.studentIds },
      {
        onSuccess: (bulkResult) => {
          setResult(bulkResult)
          if (bulkResult.failed.length === 0) {
            toast.success(
              `Enrolled ${bulkResult.succeeded.length.toString()}, waitlisted ${bulkResult.waitlisted.length.toString()}`,
            )
          } else {
            toast.warning(
              `${bulkResult.succeeded.length.toString()} enrolled, ${bulkResult.waitlisted.length.toString()} waitlisted, ${bulkResult.failed.length.toString()} failed`,
            )
          }
        },
        onError: (error) => {
          toast.error('Bulk enrolment failed', getSafeErrorMessage(error))
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk enrol students</DialogTitle>
          <DialogDescription>
            Each student is enrolled independently and transaction-safely by the server — a partial
            result (some confirmed, some waitlisted, some failed) is normal, not an error.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border-border rounded-lg border p-3">
                <p className="text-h3 font-semibold">{result.succeeded.length}</p>
                <p className="text-caption text-muted-foreground">Enrolled</p>
              </div>
              <div className="border-border rounded-lg border p-3">
                <p className="text-h3 font-semibold">{result.waitlisted.length}</p>
                <p className="text-caption text-muted-foreground">Waitlisted</p>
              </div>
              <div className="border-border rounded-lg border p-3">
                <p className="text-h3 font-semibold">{result.failed.length}</p>
                <p className="text-caption text-muted-foreground">Failed</p>
              </div>
            </div>
            {result.failed.length > 0 && (
              <ul className="text-caption text-destructive flex flex-col gap-1">
                {result.failed.map((failure) => (
                  <li key={failure.id}>{failure.reason}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  reset()
                  onOpenChange(false)
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
              className="flex flex-col gap-4"
              noValidate
            >
              <BatchSelectorField control={form.control} name="batchId" label="Batch" />
              <StudentMultiSelectField control={form.control} name="studentIds" label="Students" />
              {batch && selectedCount > 0 && (
                <p className="text-caption text-muted-foreground">
                  {selectedCount} student{selectedCount === 1 ? '' : 's'} selected ·{' '}
                  {batch.availableSeats} seat{batch.availableSeats === 1 ? '' : 's'} available —
                  approximately {expectedConfirmed} may be confirmed and {expectedWaitlisted} may be
                  waitlisted (the server decides the actual result).
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={bulkEnroll.isPending}>
                  {bulkEnroll.isPending ? 'Enrolling…' : 'Enrol Students'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
