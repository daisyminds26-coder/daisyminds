import type { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

interface TextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'time'
  autoComplete?: string
  disabled?: boolean
}

/** RHF + Zod bound text input, wired through shadcn's `Form*` primitives so error state/messages are automatic. */
export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  autoComplete,
  disabled,
}: TextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
