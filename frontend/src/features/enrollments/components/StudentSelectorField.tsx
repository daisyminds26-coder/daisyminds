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
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
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
import { listStudents } from '@/features/students/api/students.api'

interface StudentSelectorFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
}

/**
 * Single-select student combobox — same search-combobox template
 * `PrimaryTrainerField`/`EligibleTrainersField` established, applied to
 * `features/students/api/students.api.ts#listStudents` (read-only,
 * cross-feature reuse). The backend is authoritative on Enrollllment
 * eligibility (duplicate/suspended-account/etc.) — this only lets the
 * admin search and pick; a `SUSPENDED`/`DEACTIVATED` account is shown with
 * a visible status flag rather than silently hidden, so an admin
 * understands *why* a subsequent submit might be rejected.
 */
export function StudentSelectorField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: StudentSelectorFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const studentsQuery = useQuery({
    queryKey: ['students', 'Enrollllment-search', search],
    queryFn: () => listStudents({ page: 1, limit: 20, search: search || undefined }),
  })

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedId = (field.value as string | undefined) ?? ''
        const selectedStudent = (studentsQuery.data?.data ?? []).find(
          (student) => student.id === selectedId,
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
                    {selectedStudent
                      ? `${selectedStudent.displayName ?? `${selectedStudent.firstName} ${selectedStudent.lastName}`} · ${selectedStudent.studentId}`
                      : 'Search by name, student ID, or email…'}
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search students…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {studentsQuery.isLoading ? 'Searching…' : 'No students found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {(studentsQuery.data?.data ?? []).map((student) => (
                        <CommandItem
                          key={student.id}
                          value={student.id}
                          onSelect={() => {
                            field.onChange(student.id === selectedId ? '' : student.id)
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4 shrink-0',
                              student.id === selectedId ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <Avatar className="mr-2 size-6 shrink-0">
                            <AvatarImage src={student.profilePhotoUrl ?? undefined} alt="" />
                            <AvatarFallback>{student.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="flex flex-col">
                            <span>
                              {student.displayName ?? `${student.firstName} ${student.lastName}`}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {student.studentId} · {student.email}
                              {student.status !== 'ACTIVE' &&
                                student.status !== 'PENDING_VERIFICATION'
                                ? ` · ${student.status}`
                                : ''}
                            </span>
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
