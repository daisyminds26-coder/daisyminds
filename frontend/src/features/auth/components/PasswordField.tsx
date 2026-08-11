import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
import { Button } from '@/shared/components/ui/button'

interface PasswordFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  autoComplete?: string
  description?: string
  disabled?: boolean
}

/** Password input with a show/hide toggle — shared by login, reset, and change-password forms. */
export function PasswordField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = '••••••••',
  autoComplete,
  description,
  disabled,
}: PasswordFieldProps<TFieldValues>) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                type={isVisible ? 'text' : 'password'}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className="pr-10"
              />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => {
                setIsVisible((value) => !value)
              }}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
            >
              {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
