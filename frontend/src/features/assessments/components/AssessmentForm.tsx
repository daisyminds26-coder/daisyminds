import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Form } from '@/shared/components/ui/form'
import { Label } from '@/shared/components/ui/label'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { DateTimePickerField } from '@/shared/components/forms/date-time-picker-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCoursesList } from '@/features/courses/hooks/use-courses-list'
import { useBatchesList } from '@/features/batches/hooks/use-batches-list'
import {
  useCreateAssessment,
  useUpdateAssessment,
} from '@/features/assessments/hooks/use-assessment-mutations'
import { ASSESSMENT_TYPES } from '@/features/assessments/types'
import type { AdminAssessment, CreateAssessmentPayload } from '@/features/assessments/types'

function numericString(message: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, message)
}

const formSchema = z.object({
  assessmentType: z.enum(ASSESSMENT_TYPES),
  courseId: z.string().min(1, 'Course is required'),
  batchIds: z.array(z.string()).min(1, 'At least one batch is required'),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000),
  instructions: z.string().trim().max(10_000),
  timezone: z.string().trim().min(1),
  openAt: z.string(),
  closeAt: z.string(),
  durationMinutes: numericString('Enter a valid duration'),
  maxAttempts: numericString('Enter a valid number'),
  passingPercentage: z.union([numericString('Enter a valid percentage'), z.literal('')]),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  showResultImmediately: z.boolean(),
  showCorrectAnswersAfterResult: z.boolean(),
  allowReviewAfterSubmit: z.boolean(),
  negativeMarkingEnabled: z.boolean(),
})

type FormValues = z.input<typeof formSchema>

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface AssessmentFormProps {
  existing?: AdminAssessment
  onDone?: () => void
}

export function AssessmentForm({ existing, onDone }: AssessmentFormProps) {
  const navigate = useNavigate()
  const coursesQuery = useCoursesList({ page: 1, limit: 100, status: 'PUBLISHED' })
  const createAssessment = useCreateAssessment()
  const updateAssessment = useUpdateAssessment(existing?.id ?? '')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assessmentType: existing?.assessmentType ?? 'QUIZ',
      courseId: existing?.courseId ?? '',
      batchIds: existing?.batches.map((batch) => batch.id) ?? [],
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      instructions: existing?.instructions ?? '',
      timezone: existing?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      openAt: toDateTimeLocal(existing?.openAt ?? null),
      closeAt: toDateTimeLocal(existing?.closeAt ?? null),
      durationMinutes: existing ? String(existing.durationMinutes) : '30',
      maxAttempts: existing ? String(existing.maxAttempts) : '3',
      passingPercentage:
        existing?.passingPercentage !== null && existing?.passingPercentage !== undefined
          ? String(existing.passingPercentage)
          : '',
      shuffleQuestions: existing?.shuffleQuestions ?? false,
      shuffleOptions: existing?.shuffleOptions ?? false,
      showResultImmediately: existing?.showResultImmediately ?? false,
      showCorrectAnswersAfterResult: existing?.showCorrectAnswersAfterResult ?? false,
      allowReviewAfterSubmit: existing?.allowReviewAfterSubmit ?? true,
      negativeMarkingEnabled: existing?.negativeMarkingEnabled ?? false,
    },
  })

  const courseId = form.watch('courseId')
  const batchesQuery = useBatchesList({ page: 1, limit: 100, courseId: courseId || undefined })

  function handleSubmit(values: FormValues) {
    const payload: CreateAssessmentPayload = {
      assessmentType: values.assessmentType,
      courseId: values.courseId,
      batchIds: values.batchIds,
      title: values.title,
      description: values.description === '' ? undefined : values.description,
      instructions: values.instructions === '' ? undefined : values.instructions,
      timezone: values.timezone,
      openAt: values.openAt === '' ? undefined : new Date(values.openAt).toISOString(),
      closeAt: values.closeAt === '' ? undefined : new Date(values.closeAt).toISOString(),
      durationMinutes: Number(values.durationMinutes),
      maxAttempts: Number(values.maxAttempts),
      passingPercentage:
        values.passingPercentage === '' ? undefined : Number(values.passingPercentage),
      shuffleQuestions: values.shuffleQuestions,
      shuffleOptions: values.shuffleOptions,
      showResultImmediately: values.showResultImmediately,
      showCorrectAnswersAfterResult: values.showCorrectAnswersAfterResult,
      allowReviewAfterSubmit: values.allowReviewAfterSubmit,
      negativeMarkingEnabled: values.negativeMarkingEnabled,
    }

    if (existing) {
      updateAssessment.mutate(payload, {
        onSuccess: () => {
          toast.success('Assessment updated')
          onDone?.()
        },
        onError: (error) => toast.error('Could not update assessment', getSafeErrorMessage(error)),
      })
    } else {
      createAssessment.mutate(payload, {
        onSuccess: (created) => {
          toast.success('Assessment created')
          void navigate(`/admin/assessments/${created.id}`)
        },
        onError: (error) => toast.error('Could not create assessment', getSafeErrorMessage(error)),
      })
    }
  }

  const isPending = createAssessment.isPending || updateAssessment.isPending

  function onInvalid() {
    toast.error('Check the highlighted fields', 'Some required fields are missing or invalid.')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(handleSubmit, onInvalid)(event)}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="assessmentType"
              label="Type"
              options={[
                { value: 'QUIZ', label: 'Quiz' },
                { value: 'EXAM', label: 'Examination' },
              ]}
            />
            <TextField control={form.control} name="title" label="Title" />
            <SelectField
              control={form.control}
              name="courseId"
              label="Course"
              options={(coursesQuery.data?.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
              }))}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Target batches</Label>
              {batchesQuery.isLoading ? (
                <ListSkeleton rows={2} />
              ) : (
                <div className="border-border max-h-48 overflow-y-auto rounded-lg border">
                  {(batchesQuery.data?.data ?? []).map((batch) => {
                    // eslint-disable-next-line react-hooks/incompatible-library -- see `CreateEnrollllmentWizard.tsx`'s identical comment
                    const selected = form.watch('batchIds')
                    const checked = selected.includes(batch.id)
                    return (
                      <label
                        key={batch.id}
                        className="border-border flex items-center gap-3 border-b p-2.5 last:border-b-0"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            if (value) form.setValue('batchIds', [...selected, batch.id])
                            else
                              form.setValue(
                                'batchIds',
                                selected.filter((id) => id !== batch.id),
                              )
                          }}
                        />
                        <span className="text-body-sm">{batch.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              {form.formState.errors.batchIds && (
                <p className="text-caption text-destructive">
                  {form.formState.errors.batchIds.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <TextareaField
                control={form.control}
                name="description"
                label="Description (optional)"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <TextareaField
                control={form.control}
                name="instructions"
                label="Instructions shown to students (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            <TextField control={form.control} name="timezone" label="Timezone (IANA)" />
            <TextField control={form.control} name="durationMinutes" label="Duration (minutes)" />
            <DateTimePickerField control={form.control} name="openAt" label="Opens at (optional)" />
            <DateTimePickerField
              control={form.control}
              name="closeAt"
              label="Closes at (optional)"
            />
            <TextField control={form.control} name="maxAttempts" label="Max attempts" />
            <TextField
              control={form.control}
              name="passingPercentage"
              label="Passing percentage (optional)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2">
            {(
              [
                ['shuffleQuestions', 'Shuffle question order per attempt'],
                ['shuffleOptions', 'Shuffle option order per attempt'],
                ['negativeMarkingEnabled', 'Enable negative marking'],
                [
                  'showResultImmediately',
                  'Show result immediately after submit (if no manual grading pending)',
                ],
                [
                  'showCorrectAnswersAfterResult',
                  'Show correct answers once the result is visible',
                ],
                [
                  'allowReviewAfterSubmit',
                  'Allow students to review their own answers after submitting',
                ],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="flex items-start gap-3">
                <Checkbox
                  checked={form.watch(name)}
                  onCheckedChange={(checked) => {
                    form.setValue(name, checked === true)
                  }}
                />
                <span className="text-body-sm">{label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate('/admin/assessments')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : existing ? 'Save changes' : 'Create assessment'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
