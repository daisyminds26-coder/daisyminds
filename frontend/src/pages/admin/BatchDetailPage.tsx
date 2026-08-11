import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { z } from 'zod'
import { ArrowLeft, Copy, Download } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { getCourse } from '@/features/courses/api/courses.api'
import { getTrainer } from '@/features/trainers/api/trainers.api'
import { BatchStatusBadge } from '@/features/batches/components/BatchStatusBadge'
import { DeliveryModeBadge } from '@/features/batches/components/DeliveryModeBadge'
import { WeeklyScheduleEditor } from '@/features/batches/components/WeeklyScheduleEditor'
import { CalendarExceptionsEditor } from '@/features/batches/components/CalendarExceptionsEditor'
import { LocationFields } from '@/features/batches/components/LocationFields'
import { PrimaryTrainerField } from '@/features/batches/components/PrimaryTrainerField'
import { AssistantTrainersField } from '@/features/batches/components/AssistantTrainersField'
import { ConflictsPanel } from '@/features/batches/components/ConflictsPanel'
import { BatchAuditTimeline } from '@/features/batches/components/BatchAuditTimeline'
import { BatchStudentsTab } from '@/features/batches/components/BatchStudentsTab'
import { BatchCapacityWidget } from '@/features/batches/components/BatchCapacityWidget'
import { BatchHealthPanel } from '@/features/batches/components/BatchHealthPanel'
import { BatchQuickActions } from '@/features/batches/components/BatchQuickActions'
import { BatchTrainerPanel } from '@/features/batches/components/BatchTrainerPanel'
import { BatchWeeklyTimetableSummary } from '@/features/batches/components/BatchWeeklyTimetableSummary'
import { BatchCalendarView } from '@/features/batches/components/BatchCalendarView'
import { FutureModuleCards } from '@/features/batches/components/FutureModuleCards'
import { DuplicateBatchDialog } from '@/features/batches/components/DuplicateBatchDialog'
import { useBatch } from '@/features/batches/hooks/use-batch'
import { useBatchCapacity } from '@/features/batches/hooks/use-batch-capacity'
import { useBatchConflicts } from '@/features/batches/hooks/use-batch-conflicts'
import { useUpdateBatch } from '@/features/batches/hooks/use-update-batch'
import { useAssignTrainers } from '@/features/batches/hooks/use-assign-trainers'
import { useUpdateWeeklySchedule } from '@/features/batches/hooks/use-update-weekly-schedule'
import { useUpdateCalendarExceptions } from '@/features/batches/hooks/use-update-calendar-exceptions'
import { useExportEnrollments } from '@/features/enrollments/hooks/use-export-enrollments'
import { computeWeeklyTeachingMinutes } from '@/features/batches/utils/schedule-stats'
import {
  useActivateBatch,
  useArchiveBatch,
  useCancelBatch,
  useCompleteBatch,
  useRestoreBatch,
  useScheduleBatch,
  useSoftDeleteBatch,
  useUnscheduleBatch,
} from '@/features/batches/hooks/use-batch-lifecycle'
import { BATCH_DELIVERY_MODES } from '@/features/batches/types'
import type { AdminBatch } from '@/features/batches/types'
import {
  calendarExceptionsSchema,
  updateBatchSchema,
  weeklyScheduleSchema,
  type UpdateBatchFormValues,
} from '@/features/batches/schemas/batch.schemas'
import {
  emptyToUndefined,
  toCalendarExceptionsPayload,
  toLocationPayload,
  toNumberOrUndefined,
  toWeeklySchedulePayload,
} from '@/features/batches/utils/payload-mappers'
import type { AssignTrainersPayload, UpdateBatchPayload } from '@/features/batches/api/batches.api'

type PendingConfirmation = { type: 'cancel' } | { type: 'archive' } | { type: 'delete' } | null

const scheduleFormSchema = z.object({ weeklySchedule: weeklyScheduleSchema }).strict()
type ScheduleFormValues = z.input<typeof scheduleFormSchema>

const exceptionsFormSchema = z.object({ calendarExceptions: calendarExceptionsSchema }).strict()
type ExceptionsFormValues = z.input<typeof exceptionsFormSchema>

const trainersFormSchema = z
  .object({
    primaryTrainerId: z.string().optional().or(z.literal('')),
    assistantTrainerIds: z.array(z.string()).max(10).default([]),
  })
  .strict()
type TrainersFormValues = z.input<typeof trainersFormSchema>

function toScheduleFormValues(batch: AdminBatch): ScheduleFormValues {
  return {
    weeklySchedule: batch.weeklySchedule.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      sessionLabel: slot.sessionLabel ?? '',
      locationOverride: slot.locationOverride ?? '',
      deliveryModeOverride: slot.deliveryModeOverride ?? undefined,
    })),
  }
}

function toExceptionsFormValues(batch: AdminBatch): ExceptionsFormValues {
  return {
    calendarExceptions: batch.calendarExceptions.map((exception) => ({
      date: new Date(exception.date),
      type: exception.type,
      title: exception.title,
      note: exception.note ?? '',
    })),
  }
}

function toTrainersFormValues(batch: AdminBatch): TrainersFormValues {
  return {
    primaryTrainerId: batch.primaryTrainerId ?? '',
    assistantTrainerIds: batch.assistantTrainerIds,
  }
}

function toSettingsFormValues(batch: AdminBatch): UpdateBatchFormValues {
  return {
    name: batch.name,
    shortName: batch.shortName ?? '',
    description: batch.description,
    startDate: batch.startDate ? new Date(batch.startDate) : undefined,
    endDate: batch.endDate ? new Date(batch.endDate) : undefined,
    enrollmentOpenDate: batch.enrollmentOpenDate ? new Date(batch.enrollmentOpenDate) : undefined,
    enrollmentCloseDate: batch.enrollmentCloseDate
      ? new Date(batch.enrollmentCloseDate)
      : undefined,
    timezone: batch.timezone,
    deliveryMode: batch.deliveryMode,
    maxStudents: String(batch.maxStudents),
    minimumStudents: batch.minimumStudents !== null ? String(batch.minimumStudents) : '',
    waitlistEnabled: batch.waitlistEnabled,
    location: {
      meetingProvider: batch.location.meetingProvider ?? undefined,
      virtualClassNotes: batch.location.virtualClassNotes ?? '',
      venueName: batch.location.venueName ?? '',
      addressLine1: batch.location.addressLine1 ?? '',
      addressLine2: batch.location.addressLine2 ?? '',
      city: batch.location.city ?? '',
      state: batch.location.state ?? '',
      postalCode: batch.location.postalCode ?? '',
      country: batch.location.country ?? '',
      room: batch.location.room ?? '',
      mapUrl: batch.location.mapUrl ?? '',
    },
    tags: batch.tags,
    internalNotes: batch.internalNotes ?? '',
  }
}

function toSettingsPayload(values: UpdateBatchFormValues): UpdateBatchPayload {
  return {
    name: values.name,
    shortName: emptyToUndefined(values.shortName),
    description: emptyToUndefined(values.description),
    startDate: values.startDate?.toISOString(),
    endDate: values.endDate?.toISOString(),
    enrollmentOpenDate: values.enrollmentOpenDate?.toISOString(),
    enrollmentCloseDate: values.enrollmentCloseDate?.toISOString(),
    timezone: values.timezone,
    deliveryMode: values.deliveryMode,
    maxStudents: Number(values.maxStudents),
    minimumStudents: toNumberOrUndefined(values.minimumStudents),
    waitlistEnabled: values.waitlistEnabled ?? false,
    location: toLocationPayload(values.location),
    tags: values.tags,
    internalNotes: emptyToUndefined(values.internalNotes),
  }
}

/** Small trainer-name lookup used across the Overview tab — mirrors `BatchesTable`'s `TrainerCell`. */
function TrainerName({ trainerId }: { trainerId: string | null }) {
  const trainerQuery = useQuery({
    queryKey: ['trainers', 'detail-lite', trainerId],
    queryFn: () => getTrainer(trainerId ?? ''),
    enabled: trainerId !== null,
  })
  if (!trainerId) return <span className="text-muted-foreground">Unassigned</span>
  if (trainerQuery.isLoading) return <span className="text-muted-foreground">Loading…</span>
  if (!trainerQuery.data) return <span className="text-muted-foreground">Unassigned</span>
  return (
    <span>
      {trainerQuery.data.firstName} {trainerQuery.data.lastName}
    </span>
  )
}

/** Compact, real-data-only operational summary (Phase 10C Scope 1) — never fabricates attendance/assignment/completion/certificate/revenue figures. */
function BatchOperationalSummary({ batch }: { batch: AdminBatch }) {
  const courseQuery = useQuery({
    queryKey: ['courses', 'detail-lite', batch.courseId],
    queryFn: () => getCourse(batch.courseId),
  })
  const weeklyHours =
    Math.round((computeWeeklyTeachingMinutes(batch.weeklySchedule) / 60) * 10) / 10

  const fields: { label: string; value: string }[] = [
    { label: 'Status', value: batch.status },
    {
      label: 'Course',
      value: courseQuery.data?.title ?? (courseQuery.isLoading ? '…' : 'Unknown'),
    },
    { label: 'Primary trainer', value: '' },
    {
      label: 'Dates',
      value: `${batch.startDate ? format(new Date(batch.startDate), 'MMM d, yyyy') : 'Not set'} – ${batch.endDate ? format(new Date(batch.endDate), 'MMM d, yyyy') : 'Not set'}`,
    },
    { label: 'Delivery mode', value: batch.deliveryMode },
    { label: 'Capacity', value: `${batch.maxStudents.toString()} max` },
    { label: 'Occupied seats', value: batch.occupiedSeats.toString() },
    { label: 'Available seats', value: batch.availableSeats.toString() },
    { label: 'Timezone', value: batch.timezone },
    { label: 'Weekly teaching hours', value: `${weeklyHours.toString()}h` },
    { label: 'Timetable slots', value: batch.weeklySchedule.length.toString() },
    { label: 'Calendar exceptions', value: batch.calendarExceptions.length.toString() },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
      {fields.map((field) => (
        <div key={field.label}>
          <p className="text-caption text-muted-foreground">{field.label}</p>
          <p className="text-body-sm font-medium">
            {field.label === 'Primary trainer' ? (
              <TrainerName trainerId={batch.primaryTrainerId} />
            ) : (
              field.value
            )}
          </p>
        </div>
      ))}
    </div>
  )
}

function OverviewTab({
  batch,
  onNavigateTab,
}: {
  batch: AdminBatch
  onNavigateTab: (tab: string) => void
}) {
  const capacityQuery = useBatchCapacity(batch.id)

  return (
    <div className="flex flex-col gap-6">
      <BatchOperationalSummary batch={batch} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BatchCapacityWidget capacity={capacityQuery.data} isLoading={capacityQuery.isLoading} />
        <BatchHealthPanel batch={batch} />
      </div>
      <BatchQuickActions
        batch={batch}
        onViewWaitlist={() => {
          onNavigateTab('students')
        }}
        onEditBatch={() => {
          onNavigateTab('operations')
        }}
      />
    </div>
  )
}

function ScheduleTab({ batch }: { batch: AdminBatch }) {
  const updateWeeklySchedule = useUpdateWeeklySchedule(batch.id)
  const updateCalendarExceptions = useUpdateCalendarExceptions(batch.id)

  const scheduleForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: toScheduleFormValues(batch),
  })
  const exceptionsForm = useForm<ExceptionsFormValues>({
    resolver: zodResolver(exceptionsFormSchema),
    defaultValues: toExceptionsFormValues(batch),
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="text-body-sm mb-2 font-medium">Weekly timetable (read-only summary)</p>
          <BatchWeeklyTimetableSummary
            weeklySchedule={batch.weeklySchedule}
            timezone={batch.timezone}
          />
        </div>
        <div>
          <p className="text-body-sm mb-2 font-medium">Calendar</p>
          <BatchCalendarView
            startDate={batch.startDate}
            endDate={batch.endDate}
            weeklySchedule={batch.weeklySchedule}
            calendarExceptions={batch.calendarExceptions}
          />
        </div>
      </div>

      <Form {...scheduleForm}>
        <form
          onSubmit={(event) =>
            void scheduleForm.handleSubmit((values) => {
              updateWeeklySchedule.mutate(toWeeklySchedulePayload(values.weeklySchedule), {
                onSuccess: () => toast.success('Weekly schedule saved'),
                onError: (error) =>
                  toast.error('Could not save weekly schedule', getSafeErrorMessage(error)),
              })
            })(event)
          }
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="text-body-sm font-medium">Weekly timetable</p>
          <WeeklyScheduleEditor<ScheduleFormValues> control={scheduleForm.control} />
          <Button type="submit" disabled={updateWeeklySchedule.isPending} className="w-fit">
            {updateWeeklySchedule.isPending ? 'Saving…' : 'Save weekly schedule'}
          </Button>
        </form>
      </Form>

      <Form {...exceptionsForm}>
        <form
          onSubmit={(event) =>
            void exceptionsForm.handleSubmit((values) => {
              updateCalendarExceptions.mutate(
                toCalendarExceptionsPayload(values.calendarExceptions),
                {
                  onSuccess: () => toast.success('Calendar exceptions saved'),
                  onError: (error) =>
                    toast.error('Could not save calendar exceptions', getSafeErrorMessage(error)),
                },
              )
            })(event)
          }
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="text-body-sm font-medium">Calendar exceptions</p>
          <CalendarExceptionsEditor<ExceptionsFormValues> control={exceptionsForm.control} />
          <Button type="submit" disabled={updateCalendarExceptions.isPending} className="w-fit">
            {updateCalendarExceptions.isPending ? 'Saving…' : 'Save calendar exceptions'}
          </Button>
        </form>
      </Form>
    </div>
  )
}

function TrainersTab({ batch }: { batch: AdminBatch }) {
  const assignTrainers = useAssignTrainers(batch.id)
  const conflictsQuery = useBatchConflicts(batch.id)
  const form = useForm<TrainersFormValues>({
    resolver: zodResolver(trainersFormSchema),
    defaultValues: toTrainersFormValues(batch),
  })

  function toPayload(values: TrainersFormValues): AssignTrainersPayload {
    return {
      primaryTrainerId: emptyToUndefined(values.primaryTrainerId) ?? null,
      assistantTrainerIds: values.assistantTrainerIds ?? [],
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <p className="text-body-sm mb-3 font-medium">Trainer summary</p>
        <BatchTrainerPanel
          batchId={batch.id}
          primaryTrainerId={batch.primaryTrainerId}
          assistantTrainerIds={batch.assistantTrainerIds}
        />
      </div>
      <div className="flex flex-col gap-6">
        <Form {...form}>
          <form
            onSubmit={(event) =>
              void form.handleSubmit((values) => {
                assignTrainers.mutate(toPayload(values), {
                  onSuccess: () => toast.success('Trainers updated'),
                  onError: (error) =>
                    toast.error('Could not update trainers', getSafeErrorMessage(error)),
                })
              })(event)
            }
            className="flex flex-col gap-4"
            noValidate
          >
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
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={assignTrainers.isPending}>
                {assignTrainers.isPending ? 'Saving…' : 'Save trainers'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void conflictsQuery.refetch()}
                disabled={conflictsQuery.isFetching}
              >
                {conflictsQuery.isFetching ? 'Checking…' : 'Check conflicts'}
              </Button>
            </div>
          </form>
        </Form>
        <ConflictsPanel conflicts={conflictsQuery.data} isLoading={conflictsQuery.isLoading} />
      </div>
    </div>
  )
}

function OperationsTab({ batch }: { batch: AdminBatch }) {
  const updateBatch = useUpdateBatch(batch.id)
  const exportEnrollments = useExportEnrollments()
  const form = useForm<UpdateBatchFormValues>({
    resolver: zodResolver(updateBatchSchema),
    defaultValues: toSettingsFormValues(batch),
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-medium">Export</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          disabled={exportEnrollments.isPending}
          onClick={() => {
            exportEnrollments.mutate({ batchId: batch.id })
          }}
        >
          <Download className="size-3.5" />
          Export Enrollment CSV
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-caption text-muted-foreground">Batch code</p>
            <p className="text-body-sm font-mono">{batch.batchCode}</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Course</p>
            <p className="text-body-sm font-mono">{batch.courseId}</p>
          </div>
        </div>
        <Form {...form}>
          <form
            onSubmit={(event) =>
              void form.handleSubmit((values) => {
                updateBatch.mutate(toSettingsPayload(values), {
                  onSuccess: () => toast.success('Batch updated'),
                  onError: (error) =>
                    toast.error('Could not update batch', getSafeErrorMessage(error)),
                })
              })(event)
            }
            className="flex flex-col gap-4"
            noValidate
          >
            <TextField control={form.control} name="name" label="Batch name" />
            <TextField control={form.control} name="shortName" label="Short name" />
            <TextareaField control={form.control} name="description" label="Description" rows={4} />
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
            <TextField control={form.control} name="timezone" label="Timezone" />
            <SelectField
              control={form.control}
              name="deliveryMode"
              label="Delivery mode"
              options={BATCH_DELIVERY_MODES.map((value) => ({ value, label: value }))}
            />
            <LocationFields<UpdateBatchFormValues> control={form.control} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="maxStudents" label="Max students" />
              <TextField control={form.control} name="minimumStudents" label="Minimum students" />
            </div>
            <CheckboxField control={form.control} name="waitlistEnabled" label="Enable waitlist" />
            <TextareaField
              control={form.control}
              name="internalNotes"
              label="Internal notes"
              rows={3}
            />
            <Button type="submit" disabled={updateBatch.isPending} className="w-fit">
              {updateBatch.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Form>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-medium">Other modules</p>
        <FutureModuleCards />
      </div>
    </div>
  )
}

export default function BatchDetailPage() {
  const { batchId = '' } = useParams<{ batchId: string }>()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') ?? 'overview')
  const [auditPage, setAuditPage] = useState(1)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)

  const batchQuery = useBatch(batchId)

  const scheduleBatch = useScheduleBatch()
  const unscheduleBatch = useUnscheduleBatch()
  const activateBatch = useActivateBatch()
  const completeBatch = useCompleteBatch()
  const cancelBatch = useCancelBatch()
  const archiveBatch = useArchiveBatch()
  const restoreBatch = useRestoreBatch()
  const softDeleteBatch = useSoftDeleteBatch()

  if (batchQuery.isLoading) return <PageLoader />
  if (batchQuery.isError || !batchQuery.data) {
    return (
      <ErrorState
        description="We couldn't load this batch."
        onRetry={() => void batchQuery.refetch()}
      />
    )
  }

  const batch = batchQuery.data

  return (
    <PageContainer
      title={batch.name}
      description={batch.batchCode}
      actions={
        <Link
          to="/admin/batches"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to batches
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <BatchStatusBadge status={batch.status} />
          <DeliveryModeBadge deliveryMode={batch.deliveryMode} />
          <span className="text-body-sm text-muted-foreground">
            {batch.startDate ? format(new Date(batch.startDate), 'MMM d, yyyy') : 'No start date'} –{' '}
            {batch.endDate ? format(new Date(batch.endDate), 'MMM d, yyyy') : 'No end date'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {batch.isDeleted ? (
            <Button
              type="button"
              onClick={() => {
                restoreBatch.mutate(batch.id, {
                  onSuccess: () => toast.success('Batch restored'),
                  onError: (error) =>
                    toast.error('Could not restore batch', getSafeErrorMessage(error)),
                })
              }}
            >
              Restore
            </Button>
          ) : (
            <>
              {batch.status === 'DRAFT' && (
                <Button
                  type="button"
                  onClick={() => {
                    scheduleBatch.mutate(batch.id, {
                      onSuccess: () => toast.success('Batch scheduled'),
                      onError: (error) =>
                        toast.error('Batch is not ready to schedule', getSafeErrorMessage(error)),
                    })
                  }}
                >
                  Schedule Batch
                </Button>
              )}
              {batch.status === 'SCHEDULED' && (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      activateBatch.mutate(batch.id, {
                        onSuccess: () => toast.success('Batch activated'),
                        onError: (error) =>
                          toast.error('Could not activate batch', getSafeErrorMessage(error)),
                      })
                    }}
                  >
                    Activate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      unscheduleBatch.mutate(batch.id, {
                        onSuccess: () => toast.success('Batch returned to draft'),
                        onError: (error) =>
                          toast.error('Could not update batch', getSafeErrorMessage(error)),
                      })
                    }}
                  >
                    Return to Draft
                  </Button>
                </>
              )}
              {batch.status === 'ACTIVE' && (
                <Button
                  type="button"
                  onClick={() => {
                    completeBatch.mutate(batch.id, {
                      onSuccess: () => toast.success('Batch completed'),
                      onError: (error) =>
                        toast.error('Could not complete batch', getSafeErrorMessage(error)),
                    })
                  }}
                >
                  Complete
                </Button>
              )}
              {(batch.status === 'DRAFT' ||
                batch.status === 'SCHEDULED' ||
                batch.status === 'ACTIVE') && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setPendingConfirmation({ type: 'cancel' })
                  }}
                >
                  Cancel
                </Button>
              )}
              {(batch.status === 'COMPLETED' || batch.status === 'CANCELLED') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingConfirmation({ type: 'archive' })
                  }}
                >
                  Archive
                </Button>
              )}
              {batch.status === 'ARCHIVED' && (
                <Button
                  type="button"
                  onClick={() => {
                    restoreBatch.mutate(batch.id, {
                      onSuccess: () => toast.success('Batch restored'),
                      onError: (error) =>
                        toast.error('Could not restore batch', getSafeErrorMessage(error)),
                    })
                  }}
                >
                  Restore
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setDuplicateOpen(true)
                }}
              >
                <Copy className="size-3.5" />
                Duplicate
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  setPendingConfirmation({ type: 'delete' })
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="trainer">Trainer</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            {activeTab === 'overview' && <OverviewTab batch={batch} onNavigateTab={setActiveTab} />}
          </TabsContent>
          <TabsContent value="students">
            {activeTab === 'students' && <BatchStudentsTab batchId={batch.id} />}
          </TabsContent>
          <TabsContent value="schedule">
            {activeTab === 'schedule' && <ScheduleTab batch={batch} />}
          </TabsContent>
          <TabsContent value="trainer">
            {activeTab === 'trainer' && <TrainersTab batch={batch} />}
          </TabsContent>
          <TabsContent value="operations">
            {activeTab === 'operations' && <OperationsTab batch={batch} />}
          </TabsContent>
          <TabsContent value="audit">
            {activeTab === 'audit' && (
              <BatchAuditTimeline batchId={batch.id} page={auditPage} onPageChange={setAuditPage} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DuplicateBatchDialog
        batchId={batch.id}
        batchName={batch.name}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        onDuplicated={() => {
          setDuplicateOpen(false)
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Cancel this batch?"
        description="This batch will be marked Cancelled. Students already engaged will need to be notified separately."
        tone="destructive"
        confirmLabel="Cancel batch"
        isConfirming={cancelBatch.isPending}
        onConfirm={() => {
          cancelBatch.mutate(batch.id, {
            onSuccess: () => {
              toast.success('Batch cancelled')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not cancel batch', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'archive'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Archive this batch?"
        description="This batch will be archived. It can be restored to Draft later."
        tone="destructive"
        confirmLabel="Archive"
        isConfirming={archiveBatch.isPending}
        onConfirm={() => {
          archiveBatch.mutate(batch.id, {
            onSuccess: () => {
              toast.success('Batch archived')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not archive batch', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Delete this batch?"
        description="This batch will be soft-deleted and can be restored later."
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteBatch.isPending}
        onConfirm={() => {
          softDeleteBatch.mutate(batch.id, {
            onSuccess: () => {
              toast.success('Batch deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete batch', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />
    </PageContainer>
  )
}
