import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'

import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Separator } from '@/shared/components/ui/separator'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { TagsField } from '@/features/trainers/components/TagsField'
import { AvailabilityEditor } from '@/features/trainers/components/AvailabilityEditor'
import { useUpdateTrainer } from '@/features/trainers/hooks/use-update-trainer'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  AVAILABILITY_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  TEACHING_LEVELS,
  TRAINER_SOURCES,
} from '@/features/trainers/types'
import {
  updateTrainerSchema,
  type UpdateTrainerFormValues,
} from '@/features/trainers/schemas/trainer.schemas'
import type { UpdateTrainerPayload } from '@/features/trainers/api/trainers.api'
import type { AdminTrainer, TrainerAddress } from '@/features/trainers/types'

function toAddressFormValue(address: TrainerAddress | null): UpdateTrainerFormValues['address'] {
  if (!address) return undefined
  return {
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  }
}

function toDefaultValues(trainer: AdminTrainer): UpdateTrainerFormValues {
  return {
    firstName: trainer.firstName,
    middleName: trainer.middleName ?? '',
    lastName: trainer.lastName,
    displayName: trainer.displayName ?? '',
    dateOfBirth: trainer.dateOfBirth ? new Date(trainer.dateOfBirth) : undefined,
    gender: trainer.gender ?? undefined,
    preferredLanguage: trainer.preferredLanguage ?? '',
    bio: trainer.bio,
    phone: trainer.phone ?? '',
    alternatePhone: trainer.alternatePhone ?? '',
    address: toAddressFormValue(trainer.address),
    emergencyContacts: trainer.emergencyContacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      alternatePhone: contact.alternatePhone ?? '',
      email: contact.email ?? '',
    })),
    designation: trainer.designation ?? '',
    department: trainer.department ?? '',
    totalYearsExperience: trainer.totalYearsExperience?.toString() ?? '',
    teachingYearsExperience: trainer.teachingYearsExperience?.toString() ?? '',
    industryYearsExperience: trainer.industryYearsExperience?.toString() ?? '',
    expertiseAreas: trainer.expertiseAreas,
    secondaryExpertise: trainer.secondaryExpertise,
    skills: trainer.skills,
    technologies: trainer.technologies,
    specializations: trainer.specializations,
    linkedinUrl: trainer.linkedinUrl ?? '',
    portfolioUrl: trainer.portfolioUrl ?? '',
    githubUrl: trainer.githubUrl ?? '',
    websiteUrl: trainer.websiteUrl ?? '',
    qualifications: trainer.qualifications.map((qualification) => ({
      degree: qualification.degree,
      institution: qualification.institution,
      boardOrUniversity: qualification.boardOrUniversity ?? '',
      fieldOfStudy: qualification.fieldOfStudy ?? '',
      yearOfCompletion: String(qualification.yearOfCompletion),
      gradeValue: qualification.gradeValue ?? '',
      gradeType: qualification.gradeType ?? undefined,
    })),
    certifications: trainer.certifications.map((certification) => ({
      name: certification.name,
      issuingOrganization: certification.issuingOrganization,
      credentialId: certification.credentialId ?? '',
      issueDate: new Date(certification.issueDate),
      expiryDate: certification.expiryDate ? new Date(certification.expiryDate) : undefined,
      verificationUrl: certification.verificationUrl ?? '',
    })),
    joiningDate: trainer.joiningDate ? new Date(trainer.joiningDate) : undefined,
    employmentType: trainer.employmentType ?? undefined,
    employmentStatus: trainer.employmentStatus,
    employeeCode: trainer.employeeCode ?? '',
    workLocation: trainer.workLocation ?? '',
    probationEndDate: trainer.probationEndDate ? new Date(trainer.probationEndDate) : undefined,
    noticePeriodDays: trainer.noticePeriodDays?.toString() ?? '',
    preferredTeachingModes: trainer.preferredTeachingModes,
    preferredTimeSlots: trainer.preferredTimeSlots,
    maxConcurrentBatches: trainer.maxConcurrentBatches?.toString() ?? '',
    maxWeeklyTeachingHours: trainer.maxWeeklyTeachingHours?.toString() ?? '',
    availabilityStatus: trainer.availabilityStatus,
    availabilityNotes: trainer.availabilityNotes ?? '',
    languagesOfInstruction: trainer.languagesOfInstruction,
    teachingLevel: trainer.teachingLevel ?? undefined,
    qualifiedToTeachSubjects: trainer.qualifiedToTeachSubjects,
    availability: trainer.availability.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timeZone: slot.timeZone,
      type: slot.type,
    })),
    source: trainer.source ?? undefined,
    notes: trainer.notes ?? '',
    tags: trainer.tags,
  }
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toPayload(values: UpdateTrainerFormValues): UpdateTrainerPayload {
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

function qualificationField(
  index: number,
  key: keyof UpdateTrainerFormValues['qualifications'][number],
): FieldPath<UpdateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `qualifications.${index}.${key}`
}

function certificationField(
  index: number,
  key: keyof UpdateTrainerFormValues['certifications'][number],
): FieldPath<UpdateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `certifications.${index}.${key}`
}

function emergencyContactField(
  index: number,
  key: keyof UpdateTrainerFormValues['emergencyContacts'][number],
): FieldPath<UpdateTrainerFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `emergencyContacts.${index}.${key}`
}

export function TrainerEditForm({
  trainer,
  onDone,
}: {
  trainer: AdminTrainer
  onDone: () => void
}) {
  const updateTrainer = useUpdateTrainer(trainer.id)
  const form = useForm<UpdateTrainerFormValues>({
    resolver: zodResolver(updateTrainerSchema),
    defaultValues: toDefaultValues(trainer),
  })
  const qualifications = useFieldArray({ control: form.control, name: 'qualifications' })
  const certifications = useFieldArray({ control: form.control, name: 'certifications' })
  const emergencyContacts = useFieldArray({ control: form.control, name: 'emergencyContacts' })

  useEffect(() => {
    form.reset(toDefaultValues(trainer))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when switching to a different trainer record
  }, [trainer.id])

  useEffect(() => {
    function warnOnUnload(event: BeforeUnloadEvent) {
      if (form.formState.isDirty) {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', warnOnUnload)
    return () => {
      window.removeEventListener('beforeunload', warnOnUnload)
    }
  }, [form.formState.isDirty])

  function onSubmit(values: UpdateTrainerFormValues) {
    updateTrainer.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Trainer updated')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not update trainer', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Form {...form}>
      <form
        id="trainer-edit-form"
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Personal information</h3>
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
            <TextField control={form.control} name="preferredLanguage" label="Preferred language" />
          </div>
          <TextareaField
            control={form.control}
            name="bio"
            label="Professional summary / bio"
            rows={3}
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Contact information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="phone" label="Primary phone" />
            <TextField control={form.control} name="alternatePhone" label="Alternate phone" />
            <div className="sm:col-span-2">
              <TextField control={form.control} name="address.line1" label="Address line 1" />
            </div>
            <TextField control={form.control} name="address.city" label="City" />
            <TextField control={form.control} name="address.state" label="State" />
            <TextField control={form.control} name="address.postalCode" label="Postal code" />
            <TextField control={form.control} name="address.country" label="Country" />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Professional profile</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="designation" label="Designation" />
            <TextField control={form.control} name="department" label="Department" />
            <TextField
              control={form.control}
              name="totalYearsExperience"
              label="Total years of experience"
            />
          </div>
          <TagsField control={form.control} name="expertiseAreas" label="Primary expertise" />
          <TagsField control={form.control} name="skills" label="Skills" />
          <TagsField control={form.control} name="technologies" label="Technologies" />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Qualifications</h3>
          {qualifications.fields.map((field, index) => (
            <div key={field.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
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

          <h3 className="text-body-sm font-semibold">Certifications</h3>
          {certifications.fields.map((field, index) => (
            <div key={field.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
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
              certifications.append({ name: '', issuingOrganization: '', issueDate: new Date() })
            }}
          >
            Add certification
          </Button>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Employment information</h3>
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
            <TextField
              control={form.control}
              name="noticePeriodDays"
              label="Notice period (days)"
            />
          </div>
          <SelectField
            control={form.control}
            name="source"
            label="Source"
            options={TRAINER_SOURCES.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
          />
          <TagsField control={form.control} name="tags" label="Tags" />
          <TextareaField control={form.control} name="notes" label="Internal notes" rows={4} />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Teaching preferences</h3>
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
              options={TEACHING_LEVELS.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
            />
          </div>
          <TagsField
            control={form.control}
            name="qualifiedToTeachSubjects"
            label="Qualified to teach (subjects)"
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Weekly availability</h3>
          <AvailabilityEditor<UpdateTrainerFormValues> control={form.control} />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Emergency contact</h3>
          {emergencyContacts.fields.map((field, index) => (
            <div key={field.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
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
        </section>
      </form>
    </Form>
  )
}
