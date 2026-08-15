import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'

import { Stepper, type StepperStep } from '@/shared/components/data-display/stepper'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Separator } from '@/shared/components/ui/separator'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { TagsField } from '@/features/students/components/TagsField'
import { useCreateStudent } from '@/features/students/hooks/use-create-student'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import { GENDERS, STUDENT_SOURCES } from '@/features/students/types'
import {
  createStudentSchema,
  type CreateStudentFormValues,
} from '@/features/students/schemas/student.schemas'
import type { CreateStudentPayload } from '@/features/students/api/students.api'

const STEPS: StepperStep[] = [
  { id: 'account', label: 'Account' },
  { id: 'contact', label: 'Contact' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'academic', label: 'Academic' },
  { id: 'admin', label: 'Admin' },
  { id: 'review', label: 'Review' },
]

const DEFAULT_VALUES: CreateStudentFormValues = {
  email: '',
  password: '',
  sendInvitation: true,
  firstName: '',
  middleName: '',
  lastName: '',
  displayName: '',
  dateOfBirth: undefined as unknown as Date,
  preferredLanguage: '',
  phone: '',
  alternatePhone: '',
  address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
  emergencyContacts: [{ name: '', phone: '', relationship: '', alternatePhone: '', email: '' }],
  educationRecords: [],
  notes: '',
  tags: [],
}

/**
 * `restrict-template-expressions` disallows a bare `number` inside a
 * template literal, but RHF's `FieldPath<T>` type for an array field is
 * itself built from a `${number}` template segment — so the array index
 * has to be interpolated somewhere. Centralizing that one interpolation
 * here (with a single, justified disable) keeps every call site below
 * fully type-checked and lint-clean.
 */
function emergencyContactField(
  index: number,
  key: keyof CreateStudentFormValues['emergencyContacts'][number],
): FieldPath<CreateStudentFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `emergencyContacts.${index}.${key}`
}

function educationRecordField(
  index: number,
  key: keyof CreateStudentFormValues['educationRecords'][number],
): FieldPath<CreateStudentFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `educationRecords.${index}.${key}`
}

function toPayload(values: CreateStudentFormValues): CreateStudentPayload {
  return {
    ...values,
    dateOfBirth: values.dateOfBirth.toISOString(),
    admissionDate: values.admissionDate?.toISOString(),
    educationRecords: values.educationRecords.map((record) => ({
      degree: record.degree,
      institution: record.institution,
      yearOfCompletion: Number(record.yearOfCompletion),
      boardOrUniversity: record.boardOrUniversity ?? null,
      fieldOfStudy: record.fieldOfStudy ?? null,
      gradeValue: record.gradeValue ?? null,
      gradeType: record.gradeType ?? null,
      documentUrl: null,
      documentPublicId: null,
    })),
  }
}

export function StudentCreateWizard({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const createStudent = useCreateStudent()
  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: DEFAULT_VALUES,
  })
  const emergencyContacts = useFieldArray({ control: form.control, name: 'emergencyContacts' })
  const educationRecords = useFieldArray({ control: form.control, name: 'educationRecords' })

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isFirstStep = stepIndex === 0

  const STEP_FIELDS: Record<string, (keyof CreateStudentFormValues)[]> = {
    account: ['email', 'password', 'firstName', 'lastName', 'dateOfBirth', 'gender'],
    contact: ['phone', 'address'],
    emergency: ['emergencyContacts'],
    academic: [],
    admin: [],
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

  function onSubmit(values: CreateStudentFormValues) {
    createStudent.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Student created')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not create student', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <Stepper steps={STEPS} currentStepId={currentStep?.id ?? 'account'} />

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          {currentStep?.id === 'account' && (
            <div className="flex flex-col gap-4">
              <TextField control={form.control} name="email" label="Email" type="email" />
              <PasswordField
                control={form.control}
                name="password"
                label="Temporary password"
                autoComplete="new-password"
                description="At least 10 characters, including a letter and a number."
              />
              <CheckboxField
                control={form.control}
                name="sendInvitation"
                label="Send invitation email"
                description="If unchecked, the account is created as ACTIVE immediately."
              />
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="firstName" label="First name" />
                <TextField control={form.control} name="middleName" label="Middle name" />
                <TextField control={form.control} name="lastName" label="Last name" />
                <TextField control={form.control} name="displayName" label="Display name" />
                <DatePickerField
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of birth"
                  toDate={new Date()}
                />
                <SelectField
                  control={form.control}
                  name="gender"
                  label="Gender"
                  options={GENDERS.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
                />
                <TextField
                  control={form.control}
                  name="preferredLanguage"
                  label="Preferred language"
                />
              </div>
            </div>
          )}

          {currentStep?.id === 'contact' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="phone" label="Primary phone" />
              <TextField control={form.control} name="alternatePhone" label="Alternate phone" />
              <div className="sm:col-span-2">
                <TextField control={form.control} name="address.line1" label="Address line 1" />
              </div>
              <div className="sm:col-span-2">
                <TextField control={form.control} name="address.line2" label="Address line 2" />
              </div>
              <TextField control={form.control} name="address.city" label="City" />
              <TextField control={form.control} name="address.state" label="State" />
              <TextField control={form.control} name="address.postalCode" label="Postal code" />
              <TextField control={form.control} name="address.country" label="Country" />
            </div>
          )}

          {currentStep?.id === 'emergency' && (
            <div className="flex flex-col gap-4">
              {emergencyContacts.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border-border flex flex-col gap-3 rounded-lg border p-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                      control={form.control}
                      name={emergencyContactField(index, 'name')}
                      label="Name"
                    />
                    <TextField
                      control={form.control}
                      name={emergencyContactField(index, 'relationship')}
                      label="Relationship"
                    />
                    <TextField
                      control={form.control}
                      name={emergencyContactField(index, 'phone')}
                      label="Phone"
                    />
                    <TextField
                      control={form.control}
                      name={emergencyContactField(index, 'alternatePhone')}
                      label="Alternate phone"
                    />
                    <TextField
                      control={form.control}
                      name={emergencyContactField(index, 'email')}
                      label="Email"
                      type="email"
                    />
                  </div>
                  {emergencyContacts.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive self-start"
                      onClick={() => {
                        emergencyContacts.remove(index)
                      }}
                    >
                      Remove contact
                    </Button>
                  )}
                </div>
              ))}
              {emergencyContacts.fields.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    emergencyContacts.append({
                      name: '',
                      phone: '',
                      relationship: '',
                      alternatePhone: '',
                      email: '',
                    })
                  }}
                >
                  Add another emergency contact
                </Button>
              )}
            </div>
          )}

          {currentStep?.id === 'academic' && (
            <div className="flex flex-col gap-4">
              <p className="text-body-sm text-muted-foreground">
                Optional — prior qualifications. Add zero or more.
              </p>
              {educationRecords.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border-border flex flex-col gap-3 rounded-lg border p-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'degree')}
                      label="Qualification"
                    />
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'institution')}
                      label="Institution"
                    />
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'boardOrUniversity')}
                      label="Board / university"
                    />
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'fieldOfStudy')}
                      label="Field of study"
                    />
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'yearOfCompletion')}
                      label="Year of completion"
                      type="number"
                    />
                    <TextField
                      control={form.control}
                      name={educationRecordField(index, 'gradeValue')}
                      label="Grade / percentage / CGPA"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive self-start"
                    onClick={() => {
                      educationRecords.remove(index)
                    }}
                  >
                    Remove record
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  educationRecords.append({
                    degree: '',
                    institution: '',
                    yearOfCompletion: String(new Date().getFullYear()),
                  })
                }}
              >
                Add education record
              </Button>
            </div>
          )}

          {currentStep?.id === 'admin' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerField
                  control={form.control}
                  name="admissionDate"
                  label="Admission date"
                  description="Defaults to today if left blank."
                />
                <SelectField
                  control={form.control}
                  name="source"
                  label="Source"
                  options={STUDENT_SOURCES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
              </div>
              <TagsField control={form.control} name="tags" label="Tags" />
              <TextareaField control={form.control} name="notes" label="Internal notes" rows={4} />
              <p className="text-caption text-muted-foreground">
                A profile photo can be added after the student is created.
              </p>
            </div>
          )}

          {currentStep?.id === 'review' && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Name:</span> {form.getValues('firstName')}{' '}
                {form.getValues('lastName')}
              </p>
              <p>
                <span className="font-medium">Email:</span> {form.getValues('email')}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {form.getValues('phone')}
              </p>
              <p>
                <span className="font-medium">Emergency contacts:</span>{' '}
                {form.getValues('emergencyContacts').length}
              </p>
              <p className="text-muted-foreground">
                Review the details above, then create the student.
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? 'Creating…' : 'Create student'}
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
