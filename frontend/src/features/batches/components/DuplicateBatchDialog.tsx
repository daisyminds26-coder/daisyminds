import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

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
import { TextField } from '@/shared/components/forms/text-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useDuplicateBatch } from '@/features/batches/hooks/use-duplicate-batch'
import {
  duplicateBatchSchema,
  type DuplicateBatchFormValues,
} from '@/features/batches/schemas/batch.schemas'
import type { DuplicateBatchPayload } from '@/features/batches/api/batches.api'

interface DuplicateBatchDialogProps {
  batchId: string
  batchName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDuplicated: (newBatchId: string) => void
}

function toPayload(values: DuplicateBatchFormValues): DuplicateBatchPayload {
  return {
    name: values.name,
    startDate: values.startDate?.toISOString(),
    endDate: values.endDate?.toISOString(),
  }
}

/** Small dialog asking for the new batch's name + optional new dates — used from both the list row action and the detail page. */
export function DuplicateBatchDialog({
  batchId,
  batchName,
  open,
  onOpenChange,
  onDuplicated,
}: DuplicateBatchDialogProps) {
  const duplicateBatch = useDuplicateBatch(batchId)
  const form = useForm<DuplicateBatchFormValues>({
    resolver: zodResolver(duplicateBatchSchema),
    defaultValues: { name: `${batchName} (Copy)`, startDate: undefined, endDate: undefined },
  })

  function onSubmit(values: DuplicateBatchFormValues) {
    duplicateBatch.mutate(toPayload(values), {
      onSuccess: (created) => {
        toast.success('Batch duplicated')
        onOpenChange(false)
        onDuplicated(created.id)
      },
      onError: (error) => {
        toast.error('Could not duplicate batch', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate batch</DialogTitle>
          <DialogDescription>
            Creates a new Draft batch on the same course, copying trainers, timetable, location, and
            capacity settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TextField control={form.control} name="name" label="New batch name" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePickerField control={form.control} name="startDate" label="Start date" />
              <DatePickerField control={form.control} name="endDate" label="End date" />
            </div>
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
              <Button type="submit" disabled={duplicateBatch.isPending}>
                {duplicateBatch.isPending ? 'Duplicating…' : 'Duplicate'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
