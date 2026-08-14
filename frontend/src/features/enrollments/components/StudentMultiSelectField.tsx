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
import { listStudents } from '@/features/students/api/students.api'

interface StudentMultiSelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  maxSelectable?: number
}

/** Multi-select combobox for bulk Enrollment — direct template `AssistantTrainersField`, applied to `listStudents`. Selected chips stay visible so an admin can review the full roster before submitting. */
export function StudentMultiSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  maxSelectable = 100,
}: StudentMultiSelectFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const studentsQuery = useQuery({
    queryKey: ['students', 'bulk-search', search],
    queryFn: () => listStudents({ page: 1, limit: 20, search: search || undefined }),
  })

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedIds = (field.value as string[] | undefined) ?? []
        const selectedStudents = (studentsQuery.data?.data ?? []).filter((student) =>
          selectedIds.includes(student.id),
        )

        function toggle(studentId: string) {
          if (selectedIds.includes(studentId)) {
            field.onChange(selectedIds.filter((id) => id !== studentId))
          } else if (selectedIds.length < maxSelectable) {
            field.onChange([...selectedIds, studentId])
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
                      ? `${selectedIds.length.toString()} student(s) selected`
                      : 'Select students…'}
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
                            toggle(student.id)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              selectedIds.includes(student.id) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {student.displayName ?? `${student.firstName} ${student.lastName}`}
                          <span className="text-muted-foreground ml-auto text-xs">
                            {student.studentId}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedStudents.length > 0 && (
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {selectedStudents.map((student) => (
                  <Badge key={student.id} variant="secondary" className="gap-1">
                    {student.displayName ?? `${student.firstName} ${student.lastName}`}
                    <button
                      type="button"
                      aria-label={`Remove ${student.firstName} ${student.lastName}`}
                      onClick={() => {
                        toggle(student.id)
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
