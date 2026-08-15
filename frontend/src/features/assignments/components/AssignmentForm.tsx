import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { DateTimePickerField } from '@/shared/components/forms/date-time-picker-field'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCoursesList } from '@/features/courses/hooks/use-courses-list'
import { useBatchesList } from '@/features/batches/hooks/use-batches-list'
import { zonedWallTimeToUtc } from '@/features/live-classes/utils/zoned-datetime'
import {
  useCreateAssignment,
  useUpdateAssignment,
} from '@/features/assignments/hooks/use-create-assignment'
import { ASSIGNMENT_SUBMISSION_TYPES } from '@/features/assignments/types'
import type { AdminAssignment } from '@/features/assignments/types'

/**
 * Numeric fields are kept as plain (regex-validated) strings throughout the
 * form's lifetime, converted to numbers only when building the API payload
 * in `handleSubmit` — `z.coerce.number()` here would make Zod's inferred
 * *input* type (what an `<input type="number">` actually puts into RHF
 * state, a string) diverge from its *output* type (number), which breaks
 * `useForm<T>()`'s single-generic-parameter `Control<T>` inference every
 * shared `*Field` component in this app is typed against — the same
 * reasoning `features/students/schemas/student.schemas.ts` documents.
 */
const numericString = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, message)

const formSchema = z
  .object({
    courseId: z.string().min(1, 'Select a course'),
    batchIds: z.array(z.string()).min(1, 'Select at least one target batch'),
    title: z.string().trim().min(1, 'Title is required').max(200),
    shortDescription: z.string().trim().max(300).optional(),
    instructions: z.string().trim().min(1, 'Instructions are required').max(10_000),
    submissionType: z.enum(ASSIGNMENT_SUBMISSION_TYPES),
    allowedFileTypes: z.string().trim().max(200).optional(),
    maxFiles: numericString('Enter a whole number'),
    maxFileSizeMb: numericString('Enter a number'),
    maxMarks: numericString('Enter max marks'),
    passingMarks: z.string().trim().optional(),
    dueDateTime: z.string().min(1, 'Due date is required'),
    timezone: z.string().trim().min(1, 'Timezone is required'),
    allowLateSubmission: z.boolean().default(false),
    lateUntil: z.string().optional(),
    allowResubmission: z.boolean().default(false),
    maxAttempts: z.string().trim().optional(),
  })
  .refine((value) => !value.passingMarks || Number(value.passingMarks) <= Number(value.maxMarks), {
    message: 'Passing marks cannot exceed max marks',
    path: ['passingMarks'],
  })

type FormValues = z.input<typeof formSchema>

interface AssignmentFormProps {
  existing?: AdminAssignment
  onDone: (assignmentId: string) => void
}

/** One page, not a multi-step wizard — every field an assignment needs fits comfortably in a few grouped sections; a stepper would only add clicks. Used for both create and edit-while-`DRAFT` (the same shape either way, per the backend's own "only DRAFT is editable" rule). */
export function AssignmentForm({ existing, onDone }: AssignmentFormProps) {
  const createAssignment = useCreateAssignment()
  const updateAssignment = useUpdateAssignment(existing?.id ?? '')
  const isPending = createAssignment.isPending || updateAssignment.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          courseId: existing.courseId,
          batchIds: existing.batches.map((batch) => batch.id),
          title: existing.title,
          shortDescription: existing.shortDescription ?? '',
          instructions: existing.instructions,
          submissionType: existing.submissionType,
          allowedFileTypes: existing.allowedFileTypes.join(', '),
          maxFiles: String(existing.maxFiles),
          maxFileSizeMb: String(Math.round(existing.maxFileSizeBytes / (1024 * 1024))),
          maxMarks: String(existing.maxMarks),
          passingMarks: existing.passingMarks !== null ? String(existing.passingMarks) : '',
          dueDateTime: '',
          timezone: existing.timezone,
          allowLateSubmission: existing.allowLateSubmission,
          allowResubmission: existing.allowResubmission,
          maxAttempts: existing.maxAttempts !== null ? String(existing.maxAttempts) : '',
        }
      : {
          courseId: '',
          batchIds: [],
          title: '',
          instructions: '',
          submissionType: 'TEXT',
          maxFiles: '1',
          maxFileSizeMb: '25',
          maxMarks: '100',
          dueDateTime: '',
          timezone: 'Asia/Kolkata',
          allowLateSubmission: false,
          allowResubmission: false,
        },
  })

  const courseId = form.watch('courseId')
  const submissionType = form.watch('submissionType')
  const allowLateSubmission = form.watch('allowLateSubmission')
  const allowResubmission = form.watch('allowResubmission')
  const [batchSearch, setBatchSearch] = useState('')

  const coursesQuery = useCoursesList({ page: 1, limit: 100, status: 'PUBLISHED' })
  const batchesQuery = useBatchesList({ page: 1, limit: 100, courseId: courseId || undefined })

  function handleSubmit(values: FormValues) {
    const payload = {
      courseId: values.courseId,
      batchIds: values.batchIds,
      title: values.title,
      shortDescription: values.shortDescription === '' ? undefined : values.shortDescription,
      instructions: values.instructions,
      submissionType: values.submissionType,
      allowedFileTypes: values.allowedFileTypes
        ? values.allowedFileTypes
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
        : undefined,
      maxFiles: Number(values.maxFiles),
      maxFileSizeBytes: Number(values.maxFileSizeMb) * 1024 * 1024,
      maxMarks: Number(values.maxMarks),
      passingMarks: values.passingMarks ? Number(values.passingMarks) : undefined,
      dueDateTime: zonedWallTimeToUtc(values.dueDateTime, values.timezone),
      timezone: values.timezone,
      allowLateSubmission: values.allowLateSubmission,
      lateUntil:
        values.allowLateSubmission && values.lateUntil
          ? zonedWallTimeToUtc(values.lateUntil, values.timezone)
          : undefined,
      allowResubmission: values.allowResubmission,
      maxAttempts:
        values.allowResubmission && values.maxAttempts ? Number(values.maxAttempts) : undefined,
    }

    const onSuccess = (assignment: AdminAssignment) => {
      toast.success(existing ? 'Assignment updated' : 'Assignment created')
      onDone(assignment.id)
    }
    const onError = (error: unknown) => {
      toast.error('Could not save assignment', getSafeErrorMessage(error))
    }

    if (existing) {
      updateAssignment.mutate(payload, { onSuccess, onError })
    } else {
      createAssignment.mutate(payload, { onSuccess, onError })
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Basic info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TextField
              control={form.control}
              name="title"
              label="Title"
              placeholder="Assignment 1 — Portfolio Site"
            />
            <TextareaField
              control={form.control}
              name="shortDescription"
              label="Short description"
              rows={2}
            />
            <TextareaField
              control={form.control}
              name="instructions"
              label="Instructions"
              rows={6}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SelectField
              control={form.control}
              name="courseId"
              label="Course"
              placeholder={coursesQuery.isLoading ? 'Loading courses…' : 'Select a course'}
              options={(coursesQuery.data?.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
              }))}
              disabled={Boolean(existing)}
            />

            {courseId && (
              <FormField
                control={form.control}
                name="batchIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Target batch(es)</FormLabel>
                    <Input
                      placeholder="Filter batches…"
                      value={batchSearch}
                      onChange={(event) => {
                        setBatchSearch(event.target.value)
                      }}
                      className="mb-2"
                    />
                    {batchesQuery.isLoading ? (
                      <ListSkeleton rows={2} />
                    ) : (
                      <div className="border-border max-h-48 overflow-y-auto rounded-lg border">
                        {(batchesQuery.data?.data ?? [])
                          .filter((batch) =>
                            batch.name.toLowerCase().includes(batchSearch.toLowerCase()),
                          )
                          .map((batch) => {
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
                                    form.setValue(
                                      'batchIds',
                                      value
                                        ? [...selected, batch.id]
                                        : selected.filter((id) => id !== batch.id),
                                      { shouldValidate: true },
                                    )
                                  }}
                                />
                                <span className="text-body-sm">{batch.name}</span>
                              </label>
                            )
                          })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission requirements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SelectField
              control={form.control}
              name="submissionType"
              label="Submission type"
              options={ASSIGNMENT_SUBMISSION_TYPES.map((value) => ({ value, label: value }))}
            />
            {(submissionType === 'FILE' || submissionType === 'MIXED') && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  control={form.control}
                  name="allowedFileTypes"
                  label="Allowed file types"
                  placeholder="pdf, docx, zip"
                  description="Comma-separated extensions"
                />
                <TextField control={form.control} name="maxFiles" label="Max files" type="number" />
                <TextField
                  control={form.control}
                  name="maxFileSizeMb"
                  label="Max file size (MB)"
                  type="number"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates &amp; marks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateTimePickerField control={form.control} name="dueDateTime" label="Due date" />
              <TextField
                control={form.control}
                name="timezone"
                label="Timezone"
                placeholder="Asia/Kolkata"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="maxMarks" label="Max marks" type="number" />
              <TextField
                control={form.control}
                name="passingMarks"
                label="Passing marks (optional)"
                type="number"
              />
            </div>

            <CheckboxField
              control={form.control}
              name="allowLateSubmission"
              label="Allow late submission"
            />
            {allowLateSubmission && (
              <DateTimePickerField
                control={form.control}
                name="lateUntil"
                label="Accept late submissions until (optional)"
              />
            )}

            <CheckboxField
              control={form.control}
              name="allowResubmission"
              label="Allow resubmission"
            />
            {allowResubmission && (
              <TextField
                control={form.control}
                name="maxAttempts"
                label="Max attempts (optional)"
                type="number"
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : existing ? 'Save changes' : 'Create assignment'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
