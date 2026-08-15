import { ChevronDownIcon } from 'lucide-react'
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
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

interface MultiSelectFieldOption {
  label: string
  value: string
}

interface MultiSelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  options: readonly MultiSelectFieldOption[]
  placeholder?: string
  description?: string
  disabled?: boolean
}

/** Checkbox-list popover for a small, fixed set of options — the field value is a `string[]`. */
export function MultiSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = 'Select options',
  description,
  disabled,
}: MultiSelectFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = (field.value as string[] | undefined) ?? []

        function toggle(value: string) {
          if (selected.includes(value)) {
            field.onChange(selected.filter((entry) => entry !== value))
          } else {
            field.onChange([...selected, value])
          }
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
                      'h-auto min-h-8 w-full justify-between gap-2 py-1.5 text-left font-normal',
                      selected.length === 0 && 'text-muted-foreground',
                    )}
                  >
                    {selected.length === 0 ? (
                      placeholder
                    ) : (
                      <span className="flex flex-1 flex-wrap gap-1">
                        {options
                          .filter((option) => selected.includes(option.value))
                          .map((option) => (
                            <Badge key={option.value} variant="secondary">
                              {option.label}
                            </Badge>
                          ))}
                      </span>
                    )}
                    <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-1.5" align="start">
                <div className="flex flex-col gap-0.5">
                  {options.map((option) => {
                    const isChecked = selected.includes(option.value)
                    return (
                      <label
                        key={option.value}
                        className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            toggle(option.value)
                          }}
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
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
