import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Check, ChevronsUpDown } from 'lucide-react'

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
import { listBatches } from '@/features/batches/api/batches.api'

interface BatchSelectorFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  /** Restricts the search to one course's batches — used by the transfer dialog, which must never offer a cross-course target (the backend re-verifies this regardless). */
  courseId?: string
  /** Batches already excluded from being a sensible target (e.g. the Enrollllment's current batch during a transfer). */
  excludeBatchId?: string
}

/**
 * Single-select batch combobox showing operational context (dates, status,
 * seats) an admin needs to make an informed Enrollllment/transfer decision —
 * the backend remains authoritative on final capacity/eligibility (a race
 * can always make a shown "1 seat left" stale by submit time).
 */
export function BatchSelectorField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  courseId,
  excludeBatchId,
}: BatchSelectorFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const batchesQuery = useQuery({
    queryKey: ['batches', 'Enrollllment-search', courseId, search],
    queryFn: () =>
      listBatches({
        page: 1,
        limit: 20,
        search: search || undefined,
        courseId,
      }),
  })

  const options = (batchesQuery.data?.data ?? []).filter((batch) => batch.id !== excludeBatchId)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedId = (field.value as string | undefined) ?? ''
        const selectedBatch = options.find((batch) => batch.id === selectedId)

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
                    {selectedBatch
                      ? `${selectedBatch.name} · ${selectedBatch.batchCode}`
                      : 'Search by batch name or code…'}
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search batches…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {batchesQuery.isLoading ? 'Searching…' : 'No batches found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {options.map((batch) => {
                        const full = batch.availableSeats <= 0
                        return (
                          <CommandItem
                            key={batch.id}
                            value={batch.id}
                            onSelect={() => {
                              field.onChange(batch.id === selectedId ? '' : batch.id)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 size-4 shrink-0',
                                batch.id === selectedId ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="flex flex-col">
                              <span>
                                {batch.name}{' '}
                                <span className="text-muted-foreground">({batch.batchCode})</span>
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {batch.status} · {batch.occupiedSeats}/{batch.maxStudents} seats
                                {full
                                  ? batch.waitlistEnabled
                                    ? ' · Full — will be waitlisted'
                                    : ' · Full — no waitlist'
                                  : ` · ${String(batch.availableSeats)} available`}
                              </span>
                            </span>
                          </CommandItem>
                        )
                      })}
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
