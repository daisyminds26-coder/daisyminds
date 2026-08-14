import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Form } from '@/shared/components/ui/form'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import {
  useGenerateFromTimetable,
  useGenerationPreview,
} from '@/features/live-classes/hooks/use-generate-live-classes'
import { CalendarClock } from 'lucide-react'

const formSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  })

type FormValues = z.infer<typeof formSchema>

interface GenerateLiveClassesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  onGenerated: () => void
}

/** Projects concrete sessions from the batch's recurring weekly timetable over a date range — preview first (calendar exceptions and out-of-range dates are already excluded server-side), then create only the selected, non-duplicate occurrences. */
export function GenerateLiveClassesDialog({
  open,
  onOpenChange,
  batchId,
  onGenerated,
}: GenerateLiveClassesDialogProps) {
  const [range, setRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) })
  const previewQuery = useGenerationPreview(range ? { batchId, ...range } : null)
  const generate = useGenerateFromTimetable()

  const selectableDates = useMemo(
    () => (previewQuery.data ?? []).filter((occurrence) => !occurrence.alreadyExists),
    [previewQuery.data],
  )

  function handlePreview(values: FormValues) {
    const nextRange = {
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      endDate: format(values.endDate, 'yyyy-MM-dd'),
    }
    setRange(nextRange)
    setSelectedDates(new Set())
  }

  function toggleDate(date: string) {
    setSelectedDates((previous) => {
      const next = new Set(previous)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function handleGenerate() {
    if (!range) return
    generate.mutate(
      { batchId, ...range, scheduledDates: [...selectedDates] },
      {
        onSuccess: (result) => {
          toast.success(
            `${String(result.created.length)} session(s) created` +
              (result.skipped > 0 ? `, ${String(result.skipped)} skipped (already existed)` : ''),
          )
          setRange(null)
          onGenerated()
        },
        onError: (error) => {
          toast.error('Could not generate sessions', getSafeErrorMessage(error))
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setRange(null)
          form.reset()
        }
      }}
      title="Generate sessions from the weekly timetable"
      description="Pick a date range — occurrences respect the batch's start/end dates and calendar exceptions automatically."
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(handlePreview)(event)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePickerField control={form.control} name="startDate" label="From" />
              <DatePickerField control={form.control} name="endDate" label="To" />
            </div>
            <Button type="submit" variant="outline" disabled={previewQuery.isFetching}>
              {previewQuery.isFetching ? 'Loading preview…' : 'Preview occurrences'}
            </Button>
          </form>
        </Form>

        {range &&
          (previewQuery.data && previewQuery.data.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No occurrences in this range"
              description="The batch has no weekly timetable slots, or every date in range is excluded."
            />
          ) : previewQuery.data ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium">
                  {selectableDates.length} new occurrence(s) found
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDates(
                      selectedDates.size === selectableDates.length
                        ? new Set()
                        : new Set(selectableDates.map((occurrence) => occurrence.scheduledDate)),
                    )
                  }}
                >
                  {selectedDates.size === selectableDates.length ? 'Clear all' : 'Select all'}
                </Button>
              </div>
              <ul className="border-border max-h-64 overflow-y-auto rounded-lg border">
                {previewQuery.data.map((occurrence) => (
                  <li
                    key={occurrence.scheduledDate}
                    className="border-border flex items-center gap-3 border-b p-2.5 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedDates.has(occurrence.scheduledDate)}
                      disabled={occurrence.alreadyExists}
                      onCheckedChange={() => {
                        toggleDate(occurrence.scheduledDate)
                      }}
                      aria-label={`Include ${occurrence.scheduledDate}`}
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="text-body-sm">
                        {occurrence.scheduledDate} ({occurrence.dayOfWeek}) · {occurrence.startTime}
                        –{occurrence.endTime}
                      </span>
                      {occurrence.alreadyExists && (
                        <span className="text-caption text-muted-foreground">
                          Already generated — skipped
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null)}
      </div>

      {range && (
        <div className="flex justify-end gap-2 pt-4">
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
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || selectedDates.size === 0}
          >
            {generate.isPending
              ? 'Generating…'
              : `Generate ${String(selectedDates.size)} session(s)`}
          </Button>
        </div>
      )}
    </Modal>
  )
}
