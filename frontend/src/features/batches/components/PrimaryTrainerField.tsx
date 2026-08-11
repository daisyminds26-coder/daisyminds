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

interface PrimaryTrainerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
}

/**
 * Single-select trainer combobox — same search/data source as
 * `AssistantTrainersField`, single-value template lifted from
 * `features/courses/components/EligibleTrainersField.tsx`. Field value is a
 * single `trainerId` string (or `''` for "unassigned"); the backend is
 * authoritative on eligibility/conflicts (see `ConflictsPanel`), this only
 * lets the user pick.
 */
export function PrimaryTrainerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: PrimaryTrainerFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const trainersQuery = useQuery({
    queryKey: ['trainers', 'primary-search', search],
    queryFn: () => listTrainers({ page: 1, limit: 20, search: search || undefined }),
  })

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedId = (field.value as string | undefined) ?? ''
        const selectedTrainer = (trainersQuery.data?.data ?? []).find(
          (trainer) => trainer.id === selectedId,
        )

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
                    {selectedTrainer
                      ? `${selectedTrainer.firstName} ${selectedTrainer.lastName}`
                      : 'Select a primary trainer…'}
                    <span className="flex items-center gap-1">
                      {selectedId && (
                        <X
                          className="text-muted-foreground size-3.5"
                          role="button"
                          aria-label="Clear primary trainer"
                          onClick={(event) => {
                            event.stopPropagation()
                            field.onChange('')
                          }}
                        />
                      )}
                      <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                    </span>
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
                            field.onChange(trainer.id === selectedId ? '' : trainer.id)
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              trainer.id === selectedId ? 'opacity-100' : 'opacity-0',
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
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
