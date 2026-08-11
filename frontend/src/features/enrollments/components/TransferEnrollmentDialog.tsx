import { zodResolver } from '@hookform/resolvers/zod'
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
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { getBatch } from '@/features/batches/api/batches.api'
import { emptyToUndefined } from '@/features/batches/utils/payload-mappers'
import { BatchSelectorField } from '@/features/enrollments/components/BatchSelectorField'
import { useTransferEnrollment } from '@/features/enrollments/hooks/use-transfer-enrollment'
import {
  transferEnrollmentSchema,
  type TransferEnrollmentFormValues,
} from '@/features/enrollments/schemas/enrollment.schemas'
import type { AdminEnrollment } from '@/features/enrollments/types'

interface TransferEnrollmentDialogProps {
  enrollment: AdminEnrollment
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransferred: (newEnrollmentId: string) => void
}

/** Target batch selection is restricted to the same course (`courseId={enrollment.courseId}`) and excludes the current batch — the backend re-verifies both regardless. */
export function TransferEnrollmentDialog({
  enrollment,
  open,
  onOpenChange,
  onTransferred,
}: TransferEnrollmentDialogProps) {
  const transferEnrollment = useTransferEnrollment()
  const form = useForm<TransferEnrollmentFormValues>({
    resolver: zodResolver(transferEnrollmentSchema),
    defaultValues: { targetBatchId: '', reason: '' },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- see `CreateEnrollmentWizard.tsx`'s identical comment
  const targetBatchId = form.watch('targetBatchId')
  const targetBatchQuery = useQuery({
    queryKey: ['batches', 'detail-lite', targetBatchId],
    queryFn: () => getBatch(targetBatchId),
    enabled: targetBatchId !== '',
  })
  const target = targetBatchQuery.data
  const willWaitlist = target ? target.availableSeats <= 0 : false

  function onSubmit(values: TransferEnrollmentFormValues) {
    transferEnrollment.mutate(
      {
        id: enrollment.id,
        sourceBatchId: enrollment.batchId,
        payload: { targetBatchId: values.targetBatchId, reason: emptyToUndefined(values.reason) },
      },
      {
        onSuccess: (newEnrollment) => {
          toast.success('Student transferred')
          onOpenChange(false)
          onTransferred(newEnrollment.id)
        },
        onError: (error) => {
          toast.error('Could not transfer enrollment', getSafeErrorMessage(error))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer to another batch</DialogTitle>
          <DialogDescription>
            Moves this student to a different batch of the same course. This will move the student
            to the selected batch; the current enrollment will be marked Dropped and linked to the
            new one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-4"
            noValidate
          >
            <BatchSelectorField
              control={form.control}
              name="targetBatchId"
              label="Target batch"
              description="Only batches for the same course are shown."
              courseId={enrollment.courseId}
              excludeBatchId={enrollment.batchId}
            />
            {target && (
              <p className="text-caption text-muted-foreground">
                {willWaitlist
                  ? target.waitlistEnabled
                    ? 'This batch is full — the student will be waitlisted after transfer.'
                    : 'This batch is full and does not accept a waitlist — the transfer will be rejected.'
                  : 'A seat is available — the student will be transferred with a reserved seat.'}
              </p>
            )}
            <TextareaField
              control={form.control}
              name="reason"
              label="Reason (optional)"
              rows={2}
            />
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
              <Button
                type="submit"
                disabled={
                  transferEnrollment.isPending ||
                  (!!target && willWaitlist && !target.waitlistEnabled)
                }
              >
                {transferEnrollment.isPending ? 'Transferring…' : 'Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
