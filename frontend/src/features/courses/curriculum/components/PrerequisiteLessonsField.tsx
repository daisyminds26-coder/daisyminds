import { useState } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Check, ChevronsUpDown, X } from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

export interface PrerequisiteCandidate {
  id: string
  title: string
}

interface PrerequisiteLessonsFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  candidates: readonly PrerequisiteCandidate[]
}

/** Structure metadata only — no student unlock/progress enforcement this phase. `candidates` is the course's own already-loaded lesson list (self excluded by the caller), not a separate API query — the curriculum tree is already in memory. */
export function PrerequisiteLessonsField<TFieldValues extends FieldValues>({
  control,
  name,
  candidates,
}: PrerequisiteLessonsFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = candidates.filter((candidate) =>
    candidate.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedIds = (field.value as string[] | undefined) ?? []
        const selected = candidates.filter((candidate) => selectedIds.includes(candidate.id))

        function toggle(id: string) {
          if (selectedIds.includes(id)) {
            field.onChange(selectedIds.filter((existing) => existing !== id))
          } else {
            field.onChange([...selectedIds, id])
          }
        }

        return (
          <FormItem>
            <FormLabel>Prerequisites</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={candidates.length === 0}
                  >
                    {selectedIds.length > 0
                      ? `${selectedIds.length.toString()} lesson(s) selected`
                      : 'Select prerequisite lessons…'}
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search lessons…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No lessons found.</CommandEmpty>
                    <CommandGroup>
                      {filtered.map((candidate) => (
                        <CommandItem
                          key={candidate.id}
                          value={candidate.id}
                          onSelect={() => {
                            toggle(candidate.id)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              selectedIds.includes(candidate.id) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {candidate.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((candidate) => (
                  <Badge key={candidate.id} variant="secondary" className="gap-1">
                    {candidate.title}
                    <button
                      type="button"
                      aria-label={`Remove ${candidate.title}`}
                      onClick={() => {
                        toggle(candidate.id)
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <FormDescription>
              Structural only — prerequisites don't yet control what a student can access.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
