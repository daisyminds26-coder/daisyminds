import { formatEnumLabel } from '@/shared/lib/utils'
import { useMemo } from 'react'
import { useFieldArray, useWatch, type Control, type FieldValues } from 'react-hook-form'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { CALENDAR_EXCEPTION_TYPES } from '@/features/batches/types'
import type { CalendarExceptionFormValues } from '@/features/batches/schemas/batch.schemas'

/** See `WeeklyScheduleEditor.tsx`'s `slotField` comment for why this cast/helper is necessary. */
function exceptionField(index: number, key: keyof CalendarExceptionFormValues): never {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `calendarExceptions.${index}.${key}` as never
}

const DEFAULT_EXCEPTION: CalendarExceptionFormValues = {
  date: new Date(),
  type: 'HOLIDAY',
  title: '',
  note: '',
}

/**
 * Add-row + chronological list editor for holiday/no-class dates — not a
 * full calendar UI (task's explicit boundary). Rows are always added at the
 * array's end via `append`, then displayed in date order below; removal
 * still targets the underlying array index so the form field paths stay
 * correct regardless of display order.
 */
export function CalendarExceptionsEditor<
  TFieldValues extends FieldValues & { calendarExceptions?: CalendarExceptionFormValues[] },
>({ control }: { control: Control<TFieldValues> }) {
  const fieldArray = useFieldArray({ control, name: 'calendarExceptions' as never })
  const watchedExceptionsRaw = useWatch({ control, name: 'calendarExceptions' as never }) as
    CalendarExceptionFormValues[] | undefined

  const orderedIndexes = useMemo(() => {
    const watchedExceptions = watchedExceptionsRaw ?? []
    return fieldArray.fields
      .map((_, index) => index)
      .sort((a, b) => {
        const dateA = watchedExceptions[a]?.date
        const dateB = watchedExceptions[b]?.date
        const timeA = dateA instanceof Date ? dateA.getTime() : 0
        const timeB = dateB instanceof Date ? dateB.getTime() : 0
        return timeA - timeB
      })
  }, [fieldArray.fields, watchedExceptionsRaw])

  return (
    <div className="flex flex-col gap-4">
      {fieldArray.fields.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No calendar exceptions"
          description="Add holidays or no-class dates that override the weekly timetable."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orderedIndexes.map((index) => {
            const field = fieldArray.fields[index]
            if (!field) return null
            return (
              <li
                key={field.id}
                className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DatePickerField
                    control={control}
                    name={exceptionField(index, 'date')}
                    label="Date"
                  />
                  <SelectField
                    control={control}
                    name={exceptionField(index, 'type')}
                    label="Type"
                    options={CALENDAR_EXCEPTION_TYPES.map((type) => ({
                      value: type,
                      label: formatEnumLabel(type),
                    }))}
                  />
                  <TextField
                    control={control}
                    name={exceptionField(index, 'title')}
                    label="Title"
                  />
                  <TextField
                    control={control}
                    name={exceptionField(index, 'note')}
                    label="Note"
                    placeholder="Optional"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive self-start"
                  onClick={() => {
                    fieldArray.remove(index)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove exception
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => {
          fieldArray.append(DEFAULT_EXCEPTION as never)
        }}
      >
        <Plus className="size-3.5" />
        Add exception
      </Button>
    </div>
  )
}
