import { useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { X } from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'

interface TagsFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
}

/** Free-text tags/list entries — Enter/comma adds the current input as a chip, backspace on an empty input removes the last one. Mirrors `features/trainers/components/TagsField.tsx` (same generic shape, duplicated per-feature per this codebase's established convention). */
export function TagsField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: TagsFieldProps<TFieldValues>) {
  const [draft, setDraft] = useState('')

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const tags = (field.value as string[] | undefined) ?? []

        function addTag(value: string) {
          const trimmed = value.trim()
          if (!trimmed || tags.includes(trimmed) || tags.length >= 30) return
          field.onChange([...tags, trimmed])
          setDraft('')
        }

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="border-input flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() => {
                        field.onChange(tags.filter((existing) => existing !== tag))
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault()
                      addTag(draft)
                    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
                      field.onChange(tags.slice(0, -1))
                    }
                  }}
                  onBlur={() => {
                    addTag(draft)
                  }}
                  placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
                  className="h-7 flex-1 border-0 shadow-none focus-visible:ring-0"
                />
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
