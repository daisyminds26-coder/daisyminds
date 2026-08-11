import { useRef } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { File as FileIcon, UploadCloud, X } from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface FileUploadFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  accept?: string
  disabled?: boolean
}

/**
 * Local file selection only — no upload happens here. SECURITY.md §6
 * requires Cloudinary uploads to go through a server-issued signed upload
 * token, so the actual upload call is intentionally deferred to when that
 * signing endpoint exists; this field just gets a `File` into form state.
 */
export function FileUploadField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  accept,
  disabled,
}: FileUploadFieldProps<TFieldValues>) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, onChange, ...field } }) => {
        const file = value as File | undefined

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div>
                <input
                  {...field}
                  ref={inputRef}
                  type="file"
                  accept={accept}
                  disabled={disabled}
                  className="hidden"
                  onChange={(event) => {
                    onChange(event.target.files?.[0])
                  }}
                />
                {file ? (
                  <div className="border-input flex items-center gap-3 rounded-md border p-3">
                    <FileIcon className="text-muted-foreground size-5 shrink-0" />
                    <span className="text-body-sm flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove file"
                      onClick={() => {
                        onChange(undefined)
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      'border-input hover:bg-muted/40 flex w-full flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    <UploadCloud className="text-muted-foreground size-6" />
                    <span className="text-body-sm text-muted-foreground">
                      Click to select a file
                    </span>
                  </button>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
