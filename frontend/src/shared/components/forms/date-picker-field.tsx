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
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

interface DatePickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
  fromDate?: Date
  toDate?: Date
}

/** Single-date picker (Popover + Calendar) bound to RHF — the field value is a `Date | undefined`. */
export function DatePickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = 'Pick a date',
  disabled,
  fromDate,
  toDate,
}: DatePickerFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = field.value as Date | undefined

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
                    <CalendarIcon className="size-4" />
                    {selected ? format(selected, 'PPP') : placeholder}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={selected}
                  onSelect={field.onChange}
                  startMonth={fromDate}
                  endMonth={toDate}
                  disabled={[
                    ...(fromDate ? [{ before: fromDate }] : []),
                    ...(toDate ? [{ after: toDate }] : []),
                  ]}
                />
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
