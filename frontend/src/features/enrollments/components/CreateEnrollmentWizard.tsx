import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Stepper, type StepperStep } from '@/shared/components/data-display/stepper'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { getBatch } from '@/features/batches/api/batches.api'
import { getStudent } from '@/features/students/api/students.api'
import { StudentSelectorField } from '@/features/enrollments/components/StudentSelectorField'
import { BatchSelectorField } from '@/features/enrollments/components/BatchSelectorField'
import { useCreateEnrollment } from '@/features/enrollments/hooks/use-create-enrollment'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  createEnrollmentSchema,
  type CreateEnrollmentFormValues,
} from '@/features/enrollments/schemas/enrollment.schemas'

const STEPS: StepperStep[] = [
  { id: 'student', label: 'Student' },
  { id: 'batch', label: 'Batch' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'review', label: 'Review' },
]

const STEP_FIELDS: Record<string, (keyof CreateEnrollmentFormValues)[]> = {
  student: ['studentId'],
  batch: ['batchId'],
  capacity: [],
  review: [],
}

export function CreateEnrollmentWizard({
  onDone,
  initialBatchId,
}: {
  onDone: (enrollmentId: string) => void
  /** Pre-seeds the batch step from a deep link (e.g. "Add Student" on a batch's Students tab) — still editable, and the server remains authoritative on capacity either way. */
  initialBatchId?: string
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const createEnrollment = useCreateEnrollment()
  const form = useForm<CreateEnrollmentFormValues>({
    resolver: zodResolver(createEnrollmentSchema),
    defaultValues: { studentId: '', batchId: initialBatchId ?? '' },
  })

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isFirstStep = stepIndex === 0

  // eslint-disable-next-line react-hooks/incompatible-library -- `watch()` is RHF's documented API for conditionally rendering fields based on another field's live value; the React Compiler's memoization skip is expected and harmless here (this whole form already re-renders on every keystroke via RHF's own subscription model)
  const studentId = form.watch('studentId')
  const batchId = form.watch('batchId')

  const studentQuery = useQuery({
    queryKey: ['students', 'detail-lite', studentId],
    queryFn: () => getStudent(studentId),
    enabled: studentId !== '',
  })
  const batchQuery = useQuery({
    queryKey: ['batches', 'detail-lite', batchId],
    queryFn: () => getBatch(batchId),
    enabled: batchId !== '',
  })

  async function goNext() {
    const fields = STEP_FIELDS[currentStep?.id ?? ''] ?? []
    const valid = fields.length === 0 || (await form.trigger(fields))
    if (!valid) return
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  function onSubmit(values: CreateEnrollmentFormValues) {
    createEnrollment.mutate(
      { studentId: values.studentId, batchId: values.batchId },
      {
        onSuccess: (enrollment) => {
          if (enrollment.status === 'WAITLISTED') {
            toast.warning('Batch is full', 'The student has been added to the waitlist.')
          } else {
            toast.success('Student enrolled successfully')
          }
          onDone(enrollment.id)
        },
        onError: (error) => {
          toast.error('Could not create enrollment', getSafeErrorMessage(error))
        },
      },
    )
  }

  const batch = batchQuery.data
  const willWaitlist = batch ? batch.availableSeats <= 0 : false
  const canProceedPastCapacity = !batch || batch.availableSeats > 0 || batch.waitlistEnabled

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <Stepper steps={STEPS} currentStepId={currentStep?.id ?? 'student'} />

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          {currentStep?.id === 'student' && (
            <StudentSelectorField
              control={form.control}
              name="studentId"
              label="Student"
              description="Search by name, student ID, or email."
            />
          )}

          {currentStep?.id === 'batch' && (
            <BatchSelectorField
              control={form.control}
              name="batchId"
              label="Batch"
              description="Search by batch name or code."
            />
          )}

          {currentStep?.id === 'capacity' && (
            <div className="flex flex-col gap-4">
              {batchQuery.isLoading ? (
                <p className="text-body-sm text-muted-foreground">Checking capacity…</p>
              ) : batch ? (
                <div
                  className={
                    willWaitlist
                      ? 'border-warning/30 bg-warning/5 flex items-start gap-2 rounded-lg border p-3'
                      : 'border-success/30 bg-success/5 flex items-start gap-2 rounded-lg border p-3'
                  }
                >
                  {willWaitlist ? (
                    <AlertTriangle
                      className="text-warning mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2
                      className="text-success mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <p className="text-body-sm font-medium">
                      {batch.occupiedSeats} / {batch.maxStudents} seats occupied ·{' '}
                      {batch.availableSeats} available
                    </p>
                    {willWaitlist ? (
                      batch.waitlistEnabled ? (
                        <p className="text-caption text-muted-foreground">
                          Batch full — student will be waitlisted.
                        </p>
                      ) : (
                        <p className="text-caption text-destructive">
                          Batch full and waitlist is not enabled — this enrollment cannot be
                          created.
                        </p>
                      )
                    ) : (
                      <p className="text-caption text-muted-foreground">
                        A seat is available — the student will be confirmed immediately.
                      </p>
                    )}
                    <p className="text-caption text-muted-foreground mt-1">
                      Capacity can change before you submit — the final result is decided by the
                      server at submission time.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">Select a batch first.</p>
              )}
            </div>
          )}

          {currentStep?.id === 'review' && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Student:</span>{' '}
                {studentQuery.data
                  ? (studentQuery.data.displayName ??
                    `${studentQuery.data.firstName} ${studentQuery.data.lastName}`)
                  : '—'}
              </p>
              <p>
                <span className="font-medium">Batch:</span> {batch?.name ?? '—'}{' '}
                {batch ? `(${batch.batchCode})` : ''}
              </p>
              <p className="text-muted-foreground">
                {willWaitlist
                  ? 'This student will be added to the waitlist.'
                  : 'This student will be confirmed with a reserved seat.'}
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>
            {isLastStep ? (
              <Button
                type="submit"
                disabled={createEnrollment.isPending || !canProceedPastCapacity}
              >
                {createEnrollment.isPending ? 'Enrolling…' : 'Enrol Student'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void goNext()}
                disabled={
                  (currentStep?.id === 'batch' && batchId === '') ||
                  (currentStep?.id === 'capacity' && !canProceedPastCapacity)
                }
              >
                Next
              </Button>
            )}
          </div>
        </form>
      </div>
    </Form>
  )
}
