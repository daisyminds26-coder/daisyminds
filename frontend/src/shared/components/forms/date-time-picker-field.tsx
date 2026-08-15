import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

interface DateTimePickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Formats a `Date` back into the same `"YYYY-MM-DDTHH:mm"` shape a native `datetime-local` input produces — every caller (`zonedWallTimeToUtc`, payload builders) already expects exactly this. */
function toDateTimeLocalString(date: Date): string {
  const year = String(date.getFullYear())
  return `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface DateTimePickerControlProps {
  value: string | undefined
  onChange: (value: string) => void
  label: string
  description?: string
  placeholder: string
  disabled?: boolean
}

/**
 * Separated from `DateTimePickerField` so the time input's in-progress
 * keystrokes live in local state, not round-tripped through RHF on every
 * keystroke — controlling the native time input directly off a value
 * recomputed via `field.onChange` fights the input's own segment-by-segment
 * typing (hour/minute/AM-PM) and drops keystrokes.
 */
function DateTimePickerControl({
  value,
  onChange,
  label,
  description,
  placeholder,
  disabled,
}: DateTimePickerControlProps) {
  const selected = value ? new Date(value) : undefined
  const [time, setTime] = useState(value ? value.slice(11, 16) : '')
  // Resets local time state when the field's value changes externally (e.g. form reset) —
  // adjusted during render rather than an effect, per React's own guidance for this pattern.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setTime(value ? value.slice(11, 16) : '')
  }

  function commitDate(date: Date | undefined) {
    if (!date) {
      onChange('')
      return
    }
    const [hours, minutes] = (time || '00:00').split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    onChange(toDateTimeLocalString(combined))
  }

  function commitTime(nextTime: string) {
    setTime(nextTime)
    if (!selected) return
    const [hours, minutes] = nextTime.split(':').map(Number)
    const combined = new Date(selected)
    combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    onChange(toDateTimeLocalString(combined))
  }

  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start gap-2 text-left font-normal',
                !selected && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                {selected ? format(selected, 'PP, p') : placeholder}
              </span>
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            onSelect={commitDate}
          />
          <div className="border-border flex items-center gap-2 border-t p-3">
            <Input
              type="time"
              value={time}
              onChange={(event) => {
                commitTime(event.target.value)
              }}
              className="flex-1"
            />
          </div>
        </PopoverContent>
      </Popover>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  )
}

/**
 * Date + time picker (Popover + Calendar + a time input) bound to RHF — the
 * field value stays the same `"YYYY-MM-DDTHH:mm"` string a native
 * `datetime-local` input produces, so it's a drop-in replacement wherever
 * that raw input was used, without touching the surrounding schema/payload
 * code. Exists because `DatePickerField` is date-only.
 */
export function DateTimePickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = 'Pick a date & time',
  disabled,
}: DateTimePickerFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <DateTimePickerControl
          value={field.value}
          onChange={field.onChange}
          label={label}
          description={description}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    />
  )
}
