import type { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Checkbox } from '@/shared/components/ui/checkbox'

interface CheckboxFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  disabled?: boolean
}

export function CheckboxField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
}: CheckboxFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start gap-2.5">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          <div className="flex flex-col gap-0.5 leading-none">
            <FormLabel className="font-normal">{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
