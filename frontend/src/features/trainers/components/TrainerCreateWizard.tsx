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
import { TagsField } from '@/features/trainers/components/TagsField'
import { AvailabilityEditor } from '@/features/trainers/components/AvailabilityEditor'
import { useCreateTrainer } from '@/features/trainers/hooks/use-create-trainer'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  AVAILABILITY_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  PREFERRED_TIME_SLOTS,
  TEACHING_LEVELS,
  TEACHING_MODES,
  TRAINER_SOURCES,
} from '@/features/trainers/types'
import {
  createTrainerSchema,
  type CreateTrainerFormValues,
} from '@/features/trainers/schemas/trainer.schemas'
import type { CreateTrainerPayload } from '@/features/trainers/api/trainers.api'

const STEPS: StepperStep[] = [
  { id: 'account', label: 'Personal' },
  { id: 'contact', label: 'Contact' },
  { id: 'professional', label: 'Professional' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'employment', label: 'Employment' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'availability', label: 'Availability' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'review', label: 'Review' },
]

const DEFAULT_VALUES: CreateTrainerFormValues = {
  email: '',
  password: '',
  sendInvitation: true,
  firstName: '',
  middleName: '',
  lastName: '',
  displayName: '',
  preferredLanguage: '',
  bio: '',
  phone: '',
  alternatePhone: '',
  emergencyContacts: [],
  designation: '',
  department: '',
  totalYearsExperience: '',
  teachingYearsExperience: '',
  industryYearsExperience: '',
  expertiseAreas: [],
  secondaryExpertise: [],
  skills: [],
  technologies: [],
  specializations: [],
  linkedinUrl: '',
  portfolioUrl: '',
  githubUrl: '',
  websiteUrl: '',
  qualifications: [],
  certifications: [],
  employmentStatus: 'ACTIVE',
  employeeCode: '',
  workLocation: '',
  noticePeriodDays: '',
  preferredTeachingModes: [],
  preferredTimeSlots: [],
  maxConcurrentBatches: '',
  maxWeeklyTeachingHours: '',
  availabilityStatus: 'AVAILABLE',
  availabilityNotes: '',
  languagesOfInstruction: [],
  qualifiedToTeachSubjects: [],
  availability: [],
  notes: '',
  tags: [],
}

/**
 * `restrict-template-expressions` disallows a bare `number` inside a
 * template literal, but RHF's `FieldPath<T>` type for an array field is
 * itself built from a `${number}` template segment — centralizing that one
 * interpolation here (with a single justified disable) keeps every call
 * site below fully type-checked and lint-clean, same pattern as the
 * students module.
 */
function qualificationField(
  index: number,
  key: keyof CreateTrainerFormValues['qualifications'][number],
): FieldPath<CreateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `qualifications.${index}.${key}`
}

function certificationField(
  index: number,
  key: keyof CreateTrainerFormValues['certifications'][number],
): FieldPath<CreateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `certifications.${index}.${key}`
}

function emergencyContactField(
  index: number,
  key: keyof CreateTrainerFormValues['emergencyContacts'][number],
): FieldPath<CreateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `emergencyContacts.${index}.${key}`
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toPayload(values: CreateTrainerFormValues): CreateTrainerPayload {
  return {
    ...values,
    dateOfBirth: values.dateOfBirth?.toISOString(),
    joiningDate: values.joiningDate?.toISOString(),
    probationEndDate: values.probationEndDate?.toISOString(),
    totalYearsExperience: toNumberOrUndefined(values.totalYearsExperience),
    teachingYearsExperience: toNumberOrUndefined(values.teachingYearsExperience),
    industryYearsExperience: toNumberOrUndefined(values.industryYearsExperience),
    noticePeriodDays: toNumberOrUndefined(values.noticePeriodDays),
    maxConcurrentBatches: toNumberOrUndefined(values.maxConcurrentBatches),
    maxWeeklyTeachingHours: toNumberOrUndefined(values.maxWeeklyTeachingHours),
    qualifications: values.qualifications.map((qualification) => ({
      degree: qualification.degree,
      institution: qualification.institution,
      boardOrUniversity: qualification.boardOrUniversity ?? null,
      fieldOfStudy: qualification.fieldOfStudy ?? null,
      yearOfCompletion: Number(qualification.yearOfCompletion),
      gradeValue: qualification.gradeValue ?? null,
      gradeType: qualification.gradeType ?? null,
      documentUrl: null,
      documentPublicId: null,
    })),
    certifications: values.certifications.map((certification) => ({
      name: certification.name,
      issuingOrganization: certification.issuingOrganization,
      credentialId: certification.credentialId ?? null,
      issueDate: certification.issueDate.toISOString(),
      expiryDate: certification.expiryDate ? certification.expiryDate.toISOString() : null,
      verificationUrl: certification.verificationUrl ?? null,
      documentUrl: null,
      documentPublicId: null,
    })),
  }
}

export function TrainerCreateWizard({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const createTrainer = useCreateTrainer()
  const form = useForm<CreateTrainerFormValues>({
    resolver: zodResolver(createTrainerSchema),
    defaultValues: DEFAULT_VALUES,
  })
  const qualifications = useFieldArray({ control: form.control, name: 'qualifications' })
  const certifications = useFieldArray({ control: form.control, name: 'certifications' })
  const emergencyContacts = useFieldArray({ control: form.control, name: 'emergencyContacts' })

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isFirstStep = stepIndex === 0

  const STEP_FIELDS: Record<string, (keyof CreateTrainerFormValues)[]> = {
    account: ['email', 'password', 'firstName', 'lastName'],
    contact: ['phone'],
    professional: [],
    qualifications: [],
    employment: ['employmentStatus'],
    teaching: ['availabilityStatus'],
    availability: ['availability'],
    emergency: [],
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

  function onSubmit(values: CreateTrainerFormValues) {
    createTrainer.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Trainer created')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not create trainer', getSafeErrorMessage(error))
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
              <TextareaField
                control={form.control}
                name="bio"
                label="Professional summary / bio"
                rows={3}
              />
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

          {currentStep?.id === 'professional' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="designation" label="Designation" />
                <TextField control={form.control} name="department" label="Department" />
                <TextField
                  control={form.control}
                  name="totalYearsExperience"
                  label="Total years of experience"
                />
                <TextField
                  control={form.control}
                  name="teachingYearsExperience"
                  label="Teaching experience (years)"
                />
                <TextField
                  control={form.control}
                  name="industryYearsExperience"
                  label="Industry experience (years)"
                />
              </div>
              <TagsField control={form.control} name="expertiseAreas" label="Primary expertise" />
              <TagsField
                control={form.control}
                name="secondaryExpertise"
                label="Secondary expertise"
              />
              <TagsField control={form.control} name="skills" label="Skills" />
              <TagsField control={form.control} name="technologies" label="Technologies" />
              <TagsField control={form.control} name="specializations" label="Specializations" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="linkedinUrl" label="LinkedIn URL" />
                <TextField control={form.control} name="portfolioUrl" label="Portfolio URL" />
                <TextField control={form.control} name="githubUrl" label="GitHub URL" />
                <TextField control={form.control} name="websiteUrl" label="Personal website" />
              </div>
            </div>
          )}

          {currentStep?.id === 'qualifications' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-body-sm font-semibold">Qualifications</h3>
                {qualifications.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border-border flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'degree')}
                        label="Qualification"
                      />
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'institution')}
                        label="Institution"
                      />
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'boardOrUniversity')}
                        label="Board / university"
                      />
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'fieldOfStudy')}
                        label="Field of study"
                      />
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'yearOfCompletion')}
                        label="Year of completion"
                      />
                      <TextField
                        control={form.control}
                        name={qualificationField(index, 'gradeValue')}
                        label="Grade / percentage / CGPA"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive self-start"
                      onClick={() => {
                        qualifications.remove(index)
                      }}
                    >
                      Remove qualification
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    qualifications.append({
                      degree: '',
                      institution: '',
                      yearOfCompletion: String(new Date().getFullYear()),
                    })
                  }}
                >
                  Add qualification
                </Button>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <h3 className="text-body-sm font-semibold">Certifications</h3>
                {certifications.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border-border flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField
                        control={form.control}
                        name={certificationField(index, 'name')}
                        label="Certification name"
                      />
                      <TextField
                        control={form.control}
                        name={certificationField(index, 'issuingOrganization')}
                        label="Issuing organization"
                      />
                      <TextField
                        control={form.control}
                        name={certificationField(index, 'credentialId')}
                        label="Credential ID"
                      />
                      <DatePickerField
                        control={form.control}
                        name={certificationField(index, 'issueDate')}
                        label="Issue date"
                        toDate={new Date()}
                      />
                      <DatePickerField
                        control={form.control}
                        name={certificationField(index, 'expiryDate')}
                        label="Expiry date"
                      />
                      <TextField
                        control={form.control}
                        name={certificationField(index, 'verificationUrl')}
                        label="Verification URL"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive self-start"
                      onClick={() => {
                        certifications.remove(index)
                      }}
                    >
                      Remove certification
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    certifications.append({
                      name: '',
                      issuingOrganization: '',
                      issueDate: new Date(),
                    })
                  }}
                >
                  Add certification
                </Button>
              </div>
            </div>
          )}

          {currentStep?.id === 'employment' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerField control={form.control} name="joiningDate" label="Joining date" />
                <SelectField
                  control={form.control}
                  name="employmentType"
                  label="Employment type"
                  options={EMPLOYMENT_TYPES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <SelectField
                  control={form.control}
                  name="employmentStatus"
                  label="Employment status"
                  options={EMPLOYMENT_STATUSES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <TextField control={form.control} name="employeeCode" label="Employee code" />
                <TextField control={form.control} name="workLocation" label="Work location" />
                <DatePickerField
                  control={form.control}
                  name="probationEndDate"
                  label="Probation end date"
                />
                <TextField
                  control={form.control}
                  name="noticePeriodDays"
                  label="Notice period (days)"
                />
              </div>
              <TagsField control={form.control} name="tags" label="Tags" />
              <SelectField
                control={form.control}
                name="source"
                label="Source"
                options={TRAINER_SOURCES.map((value) => ({
                  value,
                  label: value.replace(/_/g, ' '),
                }))}
              />
              <TextareaField control={form.control} name="notes" label="Internal notes" rows={4} />
            </div>
          )}

          {currentStep?.id === 'teaching' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="availabilityStatus"
                  label="Availability status"
                  options={AVAILABILITY_STATUSES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <SelectField
                  control={form.control}
                  name="teachingLevel"
                  label="Teaching level"
                  options={TEACHING_LEVELS.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <TextField
                  control={form.control}
                  name="maxConcurrentBatches"
                  label="Max concurrent batches"
                />
                <TextField
                  control={form.control}
                  name="maxWeeklyTeachingHours"
                  label="Max weekly teaching hours"
                />
              </div>
              <TagsField
                control={form.control}
                name="preferredTeachingModes"
                label="Preferred teaching modes"
                description={`One of: ${TEACHING_MODES.join(', ')}`}
              />
              <TagsField
                control={form.control}
                name="preferredTimeSlots"
                label="Preferred time slots"
                description={`One of: ${PREFERRED_TIME_SLOTS.join(', ')}`}
              />
              <TagsField
                control={form.control}
                name="languagesOfInstruction"
                label="Languages of instruction"
              />
              <TagsField
                control={form.control}
                name="qualifiedToTeachSubjects"
                label="Qualified to teach (subjects)"
                description="Metadata only — no course/batch assignment happens here."
              />
              <TextareaField
                control={form.control}
                name="availabilityNotes"
                label="Availability notes"
                rows={3}
              />
            </div>
          )}

          {currentStep?.id === 'availability' && (
            <AvailabilityEditor<CreateTrainerFormValues> control={form.control} />
          )}

          {currentStep?.id === 'emergency' && (
            <div className="flex flex-col gap-4">
              <p className="text-body-sm text-muted-foreground">
                Optional — add if the trainer wants one on file.
              </p>
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
                  Add emergency contact
                </Button>
              )}
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
                <span className="font-medium">Designation:</span>{' '}
                {form.getValues('designation') ?? '—'}
              </p>
              <p>
                <span className="font-medium">Availability slots:</span>{' '}
                {form.getValues('availability').length}
              </p>
              <p className="text-muted-foreground">
                Review the details above, then create the trainer.
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={createTrainer.isPending}>
                {createTrainer.isPending ? 'Creating…' : 'Create trainer'}
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
