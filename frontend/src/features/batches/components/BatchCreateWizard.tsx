import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AlertTriangle, Check, ChevronsUpDown } from 'lucide-react'

import {
  emptyToUndefined,
  toCalendarExceptionsPayload,
  toLocationPayload,
  toNumberOrUndefined,
  toWeeklySchedulePayload,
} from '@/features/batches/utils/payload-mappers'

import { Stepper, type StepperStep } from '@/shared/components/data-display/stepper'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { listCourses } from '@/features/courses/api/courses.api'
import { PrimaryTrainerField } from '@/features/batches/components/PrimaryTrainerField'
import { AssistantTrainersField } from '@/features/batches/components/AssistantTrainersField'
import { WeeklyScheduleEditor } from '@/features/batches/components/WeeklyScheduleEditor'
import { CalendarExceptionsEditor } from '@/features/batches/components/CalendarExceptionsEditor'
import { LocationFields } from '@/features/batches/components/LocationFields'
import { useCreateBatch } from '@/features/batches/hooks/use-create-batch'
import { BATCH_DELIVERY_MODES } from '@/features/batches/types'
import {
  createBatchSchema,
  type CreateBatchFormValues,
} from '@/features/batches/schemas/batch.schemas'
import type { CreateBatchPayload } from '@/features/batches/api/batches.api'

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const STEPS: StepperStep[] = [
  { id: 'course', label: 'Course & Identity' },
  { id: 'dates', label: 'Dates & Timezone' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'timetable', label: 'Weekly Timetable' },
  { id: 'delivery', label: 'Delivery & Location' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'exceptions', label: 'Calendar Exceptions' },
  { id: 'review', label: 'Review' },
]

const DEFAULT_VALUES: CreateBatchFormValues = {
  courseId: '',
  name: '',
  shortName: '',
  description: '',
  startDate: undefined,
  endDate: undefined,
  enrollmentOpenDate: undefined,
  enrollmentCloseDate: undefined,
  timezone: BROWSER_TIME_ZONE,
  deliveryMode: 'ONLINE',
  primaryTrainerId: '',
  assistantTrainerIds: [],
  maxStudents: '',
  minimumStudents: '',
  waitlistEnabled: false,
  location: {},
  weeklySchedule: [],
  calendarExceptions: [],
  tags: [],
  internalNotes: '',
}

function toPayload(values: CreateBatchFormValues): CreateBatchPayload {
  return {
    courseId: values.courseId,
    name: values.name,
    shortName: emptyToUndefined(values.shortName),
    description: emptyToUndefined(values.description),
    startDate: values.startDate?.toISOString(),
    endDate: values.endDate?.toISOString(),
    enrollmentOpenDate: values.enrollmentOpenDate?.toISOString(),
    enrollmentCloseDate: values.enrollmentCloseDate?.toISOString(),
    timezone: values.timezone,
    deliveryMode: values.deliveryMode,
    primaryTrainerId: emptyToUndefined(values.primaryTrainerId),
    assistantTrainerIds: values.assistantTrainerIds,
    maxStudents: Number(values.maxStudents),
    minimumStudents: toNumberOrUndefined(values.minimumStudents),
    waitlistEnabled: values.waitlistEnabled ?? false,
    location: toLocationPayload(values.location),
    weeklySchedule: toWeeklySchedulePayload(values.weeklySchedule),
    calendarExceptions: toCalendarExceptionsPayload(values.calendarExceptions),
    tags: values.tags,
    internalNotes: emptyToUndefined(values.internalNotes),
  }
}

/**
 * Course picker for step 1 — mirrors `EligibleTrainersField`'s
 * Command/Popover combobox pattern against `listCourses` instead of
 * `listTrainers`. PUBLISHED courses are preferred; DRAFT courses are shown
 * with a visible warning (a batch can't be scheduled against an unpublished
 * course); ARCHIVED and soft-deleted courses are never shown at all.
 */
function CourseSelectField({
  control,
}: {
  control: ReturnType<typeof useForm<CreateBatchFormValues>>['control']
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'DRAFT' | 'PUBLISHED' | null>(null)

  const coursesQuery = useQuery({
    queryKey: ['courses', 'batch-wizard-search', search],
    queryFn: () => listCourses({ page: 1, limit: 20, search: search || undefined }),
  })

  const eligibleCourses = (coursesQuery.data?.data ?? []).filter(
    (course) => course.status !== 'ARCHIVED',
  )

  return (
    <FormField
      control={control}
      name="courseId"
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>Course</FormLabel>
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
                    {selectedLabel ?? 'Select a course…'}
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search courses…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {coursesQuery.isLoading ? 'Searching…' : 'No courses found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {eligibleCourses.map((course) => (
                        <CommandItem
                          key={course.id}
                          value={course.id}
                          onSelect={() => {
                            field.onChange(course.id)
                            setSelectedLabel(course.title)
                            setSelectedStatus(course.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED')
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              course.id === field.value ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {course.title}
                          <span className="text-muted-foreground ml-auto text-xs">
                            {course.status === 'DRAFT' ? 'Draft' : 'Published'}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedStatus === 'DRAFT' && (
              <div className="border-warning/30 bg-warning/5 text-warning flex items-center gap-2 rounded-md border p-2 text-xs">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                This course is still a Draft — it must be published before this batch can be
                scheduled.
              </div>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function BatchCreateWizard({ onDone }: { onDone: (batchId: string) => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const createBatch = useCreateBatch()
  const form = useForm<CreateBatchFormValues>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isFirstStep = stepIndex === 0

  const STEP_FIELDS: Record<string, (keyof CreateBatchFormValues)[]> = {
    course: ['courseId', 'name'],
    dates: ['timezone'],
    trainers: [],
    timetable: ['weeklySchedule'],
    delivery: ['deliveryMode'],
    capacity: ['maxStudents'],
    exceptions: ['calendarExceptions'],
    review: [],
  }

  async function goNext() {
    const fields = STEP_FIELDS[currentStep?.id ?? ''] ?? []
    const valid = fields.length === 0 || (await form.trigger(fields))
    if (!valid) return
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  function onSubmit(values: CreateBatchFormValues) {
    createBatch.mutate(toPayload(values), {
      onSuccess: (created) => {
        toast.success('Batch created as Draft')
        onDone(created.id)
      },
      onError: (error) => {
        toast.error('Could not create batch', getSafeErrorMessage(error))
      },
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- `watch()` is RHF's documented API for conditionally rendering fields based on another field's live value.
  const deliveryMode = form.watch('deliveryMode')
  const timezone = form.watch('timezone')
  const maxStudents = form.watch('maxStudents')
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <Stepper steps={STEPS} currentStepId={currentStep?.id ?? 'course'} />

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          {currentStep?.id === 'course' && (
            <div className="flex flex-col gap-4">
              <CourseSelectField control={form.control} />
              <TextField control={form.control} name="name" label="Batch name" />
              <TextField control={form.control} name="shortName" label="Short name" />
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                rows={4}
              />
            </div>
          )}

          {currentStep?.id === 'dates' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerField control={form.control} name="startDate" label="Start date" />
                <DatePickerField control={form.control} name="endDate" label="End date" />
                <DatePickerField
                  control={form.control}
                  name="enrollmentOpenDate"
                  label="Enrollment opens"
                />
                <DatePickerField
                  control={form.control}
                  name="enrollmentCloseDate"
                  label="Enrollment closes"
                />
              </div>
              <TextField
                control={form.control}
                name="timezone"
                label="Timezone"
                placeholder={BROWSER_TIME_ZONE}
                description="IANA timezone identifier, e.g. Asia/Kolkata."
              />
            </div>
          )}

          {currentStep?.id === 'trainers' && (
            <div className="flex flex-col gap-4">
              <PrimaryTrainerField
                control={form.control}
                name="primaryTrainerId"
                label="Primary trainer"
              />
              <AssistantTrainersField
                control={form.control}
                name="assistantTrainerIds"
                label="Assistant trainers"
              />
            </div>
          )}

          {currentStep?.id === 'timetable' && (
            <WeeklyScheduleEditor<CreateBatchFormValues> control={form.control} />
          )}

          {currentStep?.id === 'delivery' && (
            <div className="flex flex-col gap-4">
              <SelectField
                control={form.control}
                name="deliveryMode"
                label="Delivery mode"
                options={BATCH_DELIVERY_MODES.map((value) => ({ value, label: value }))}
              />
              <LocationFields<CreateBatchFormValues> control={form.control} />
            </div>
          )}

          {currentStep?.id === 'capacity' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="maxStudents" label="Max students" />
                <TextField
                  control={form.control}
                  name="minimumStudents"
                  label="Minimum students"
                  description="Optional — used for a viability check, not enforced at enrollment."
                />
              </div>
              <CheckboxField
                control={form.control}
                name="waitlistEnabled"
                label="Enable waitlist"
                description="Allow students to join a waitlist once max capacity is reached."
              />
            </div>
          )}

          {currentStep?.id === 'exceptions' && (
            <CalendarExceptionsEditor<CreateBatchFormValues> control={form.control} />
          )}

          {currentStep?.id === 'review' && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Name:</span> {form.getValues('name')}
              </p>
              <p>
                <span className="font-medium">Timezone:</span> {timezone}
              </p>
              <p>
                <span className="font-medium">Delivery mode:</span> {deliveryMode}
              </p>
              <p>
                <span className="font-medium">Dates:</span>{' '}
                {startDate ? format(startDate, 'PP') : 'Not set'} –{' '}
                {endDate ? format(endDate, 'PP') : 'Not set'}
              </p>
              <p>
                <span className="font-medium">Max students:</span> {maxStudents || 'Not set'}
              </p>
              <p className="text-muted-foreground">
                This batch will be created as Draft — schedule it once you're ready.
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={createBatch.isPending}>
                {createBatch.isPending ? 'Creating…' : 'Create batch'}
              </Button>
            ) : (
              <Button type="button" onClick={() => void goNext()}>
                Next
              </Button>
            )}
          </div>
        </form>
      </div>
    </Form>
  )
}
