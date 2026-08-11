import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '@/utils/cn'

const fieldClasses = cn(
  'border-border bg-surface w-full rounded-xl border px-4 py-3 text-sm text-ink placeholder:text-ink-soft',
  'transition-colors focus:border-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
)

interface FieldWrapperProps {
  label: string
  error?: string
  htmlFor: string
  required?: boolean
}

function FieldLabel({ label, error, htmlFor, required }: FieldWrapperProps) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-ink text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {error && (
        <span id={`${htmlFor}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </span>
      )}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, id, required, className, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div>
      <FieldLabel label={label} error={error} htmlFor={inputId} required={required} />
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClasses, className)}
        {...props}
      />
    </div>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function TextAreaField({
  label,
  error,
  id,
  required,
  className,
  rows = 5,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div>
      <FieldLabel label={label} error={error} htmlFor={inputId} required={required} />
      <textarea
        id={inputId}
        required={required}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClasses, 'resize-none', className)}
        {...props}
      />
    </div>
  )
}
