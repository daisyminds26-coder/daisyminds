import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { listTrainers } from '@/features/trainers/api/trainers.api'

interface AssistantTrainersFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
}

/**
 * Multi-select assistant trainer combobox — direct template is
 * `features/courses/components/EligibleTrainersField.tsx`. Reuses
 * `features/trainers`' own read API (`GET /trainers`) rather than
 * duplicating a trainer list/search implementation. The backend is
 * authoritative on eligibility/availability (SECURITY.md — never trust
 * frontend input), so this only shows the trainer's own declared
 * `availabilityStatus` as a UX hint — it never blocks a selection.
 */
export function AssistantTrainersField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: AssistantTrainersFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const trainersQuery = useQuery({
    queryKey: ['trainers', 'assistant-search', search],
    queryFn: () => listTrainers({ page: 1, limit: 20, search: search || undefined }),
  })

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedIds = (field.value as string[] | undefined) ?? []
        const selectedTrainers = (trainersQuery.data?.data ?? []).filter((trainer) =>
          selectedIds.includes(trainer.id),
        )

        function toggle(trainerId: string) {
          if (selectedIds.includes(trainerId)) {
            field.onChange(selectedIds.filter((id) => id !== trainerId))
          } else {
            field.onChange([...selectedIds, trainerId])
          }
        }

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                  >
                    {selectedIds.length > 0
                      ? `${selectedIds.length.toString()} trainer(s) selected`
                      : 'Select assistant trainers…'}
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search trainers…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {trainersQuery.isLoading ? 'Searching…' : 'No trainers found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {(trainersQuery.data?.data ?? []).map((trainer) => (
                        <CommandItem
                          key={trainer.id}
                          value={trainer.id}
                          onSelect={() => {
                            toggle(trainer.id)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              selectedIds.includes(trainer.id) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {trainer.firstName} {trainer.lastName}
                          <span className="text-muted-foreground ml-auto text-xs">
                            {trainer.trainerId}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedTrainers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTrainers.map((trainer) => (
                  <Badge key={trainer.id} variant="secondary" className="gap-1">
                    {trainer.firstName} {trainer.lastName}
                    <button
                      type="button"
                      aria-label={`Remove ${trainer.firstName} ${trainer.lastName}`}
                      onClick={() => {
                        toggle(trainer.id)
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
