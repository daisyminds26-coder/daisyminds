import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCreateLiveClass } from '@/features/live-classes/hooks/use-create-live-class'
import { useBatchTrainerOptions } from '@/features/live-classes/hooks/use-batch-trainer-options'
import { zonedWallTimeToUtc } from '@/features/live-classes/utils/zoned-datetime'
import { LIVE_CLASS_DELIVERY_MODES, LIVE_CLASS_PROVIDERS } from '@/features/live-classes/types'

const formSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional(),
    startDateTime: z.string().min(1, 'Start time is required'),
    endDateTime: z.string().min(1, 'End time is required'),
    deliveryMode: z.enum(LIVE_CLASS_DELIVERY_MODES),
    provider: z.enum(LIVE_CLASS_PROVIDERS),
    joinUrl: z.string().trim().max(1000).optional(),
    primaryTrainerId: z.string().optional(),
  })
  .refine((value) => new Date(value.startDateTime) < new Date(value.endDateTime), {
    message: 'Start time must be before end time',
    path: ['endDateTime'],
  })
  .refine((value) => value.provider === 'OFFLINE' || Boolean(value.joinUrl), {
    message: 'A join URL is required for this delivery mode',
    path: ['joinUrl'],
  })

type FormValues = z.infer<typeof formSchema>

interface CreateLiveClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  batchTimezone: string
  batchDeliveryMode: 'ONLINE' | 'OFFLINE' | 'HYBRID'
  primaryTrainerId: string | null
  assistantTrainerIds: string[]
  onCreated: (liveClassId: string) => void
}

/** Manual single-session creation, always scoped to one already-known batch — a live class is never created "unattached," and the batch's own timezone/delivery-mode/trainers seed sensible defaults. For projecting many sessions from the recurring weekly timetable, see `GenerateLiveClassesDialog`. */
export function CreateLiveClassDialog({
  open,
  onOpenChange,
  batchId,
  batchTimezone,
  batchDeliveryMode,
  primaryTrainerId,
  assistantTrainerIds,
  onCreated,
}: CreateLiveClassDialogProps) {
  const createLiveClass = useCreateLiveClass()
  const trainerOptions = useBatchTrainerOptions(primaryTrainerId, assistantTrainerIds)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      deliveryMode: batchDeliveryMode,
      provider: batchDeliveryMode === 'OFFLINE' ? 'OFFLINE' : 'MANUAL_LINK',
      joinUrl: '',
      primaryTrainerId: primaryTrainerId ?? undefined,
    },
  })

  function handleSubmit(values: FormValues) {
    createLiveClass.mutate(
      {
        batchId,
        title: values.title,
        description: values.description?.trim().length ? values.description : undefined,
        startDateTime: zonedWallTimeToUtc(values.startDateTime, batchTimezone),
        endDateTime: zonedWallTimeToUtc(values.endDateTime, batchTimezone),
        timezone: batchTimezone,
        deliveryMode: values.deliveryMode,
        provider: values.provider,
        joinUrl: values.joinUrl?.trim().length ? values.joinUrl : undefined,
        trainerIds: values.primaryTrainerId ? [values.primaryTrainerId] : [],
        primaryTrainerId: values.primaryTrainerId?.trim().length
          ? values.primaryTrainerId
          : undefined,
      },
      {
        onSuccess: (created) => {
          toast.success('Live class created')
          form.reset()
          onCreated(created.id)
        },
        onError: (error) => {
          toast.error('Could not create session', getSafeErrorMessage(error))
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create a live class"
      description="Schedule a single session for this batch. Trainer conflicts and batch-range checks run on save."
    >
      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
          className="flex flex-col gap-4"
        >
          <TextField
            control={form.control}
            name="title"
            label="Session title"
            placeholder="Week 1 — Introduction"
          />
          <TextareaField control={form.control} name="description" label="Description" rows={2} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start ({batchTimezone})</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End ({batchTimezone})</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="deliveryMode"
              label="Delivery mode"
              options={LIVE_CLASS_DELIVERY_MODES.map((value) => ({ value, label: value }))}
            />
            <SelectField
              control={form.control}
              name="provider"
              label="Meeting provider"
              options={LIVE_CLASS_PROVIDERS.map((value) => ({
                value,
                label: value.replace(/_/g, ' '),
              }))}
            />
          </div>

          <TextField
            control={form.control}
            name="joinUrl"
            label="Join URL"
            placeholder="https://meet.example.com/…"
            description="HTTPS only. Shown to students once the join window opens."
          />

          <SelectField
            control={form.control}
            name="primaryTrainerId"
            label="Trainer"
            placeholder={trainerOptions.isLoading ? 'Loading trainers…' : 'Select a trainer'}
            options={trainerOptions.options}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLiveClass.isPending}>
              {createLiveClass.isPending ? 'Creating…' : 'Create session'}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  )
}
