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
import { TagsField } from '@/features/students/components/TagsField'
import { useUpdateStudent } from '@/features/students/hooks/use-update-student'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import { GENDERS, STUDENT_SOURCES } from '@/features/students/types'
import {
  updateStudentSchema,
  type UpdateStudentFormValues,
} from '@/features/students/schemas/student.schemas'
import type { UpdateStudentPayload } from '@/features/students/api/students.api'
import type { AdminStudent, StudentAddress } from '@/features/students/types'

function toAddressFormValue(address: StudentAddress | null): UpdateStudentFormValues['address'] {
  return {
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? '',
  }
}

function toDefaultValues(student: AdminStudent): UpdateStudentFormValues {
  return {
    firstName: student.firstName,
    middleName: student.middleName ?? '',
    lastName: student.lastName,
    displayName: student.displayName ?? '',
    dateOfBirth: student.dateOfBirth
      ? new Date(student.dateOfBirth)
      : (undefined as unknown as Date),
    gender: student.gender ?? undefined,
    preferredLanguage: student.preferredLanguage ?? '',
    phone: student.phone ?? '',
    alternatePhone: student.alternatePhone ?? '',
    address: toAddressFormValue(student.address),
    emergencyContacts:
      student.emergencyContacts.length > 0
        ? student.emergencyContacts.map((contact) => ({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            alternatePhone: contact.alternatePhone ?? '',
            email: contact.email ?? '',
          }))
        : [{ name: '', phone: '', relationship: '', alternatePhone: '', email: '' }],
    educationRecords: student.educationRecords.map((record) => ({
      degree: record.degree,
      institution: record.institution,
      yearOfCompletion: String(record.yearOfCompletion),
      boardOrUniversity: record.boardOrUniversity ?? '',
      fieldOfStudy: record.fieldOfStudy ?? '',
      gradeValue: record.gradeValue ?? '',
      gradeType: record.gradeType ?? undefined,
    })),
    admissionDate: student.admissionDate ? new Date(student.admissionDate) : undefined,
    source: student.source ?? undefined,
    notes: student.notes ?? '',
    tags: student.tags,
  }
}

function toPayload(values: UpdateStudentFormValues): UpdateStudentPayload {
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
  key: keyof UpdateStudentFormValues['emergencyContacts'][number],
): FieldPath<UpdateStudentFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `emergencyContacts.${index}.${key}`
}

function educationRecordField(
  index: number,
  key: keyof UpdateStudentFormValues['educationRecords'][number],
): FieldPath<UpdateStudentFormValues> {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- `index` is a numeric array index, never arbitrary content
  return `educationRecords.${index}.${key}`
}

export function StudentEditForm({
  student,
  onDone,
}: {
  student: AdminStudent
  onDone: () => void
}) {
  const updateStudent = useUpdateStudent(student.id)
  const form = useForm<UpdateStudentFormValues>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: toDefaultValues(student),
  })
  const emergencyContacts = useFieldArray({ control: form.control, name: 'emergencyContacts' })
  const educationRecords = useFieldArray({ control: form.control, name: 'educationRecords' })

  useEffect(() => {
    form.reset(toDefaultValues(student))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when switching to a different student record
  }, [student.id])

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

  function onSubmit(values: UpdateStudentFormValues) {
    updateStudent.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Student updated')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not update student', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <Form {...form}>
      <form
        id="student-edit-form"
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
            <div className="sm:col-span-2">
              <TextField control={form.control} name="address.line2" label="Address line 2" />
            </div>
            <TextField control={form.control} name="address.city" label="City" />
            <TextField control={form.control} name="address.state" label="State" />
            <TextField control={form.control} name="address.postalCode" label="Postal code" />
            <TextField control={form.control} name="address.country" label="Country" />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Emergency contacts</h3>
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
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Academic background</h3>
          {educationRecords.fields.map((field, index) => (
            <div key={field.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
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
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Administrative information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField control={form.control} name="admissionDate" label="Admission date" />
            <SelectField
              control={form.control}
              name="source"
              label="Source"
              options={STUDENT_SOURCES.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
            />
          </div>
          <TagsField control={form.control} name="tags" label="Tags" />
          <TextareaField control={form.control} name="notes" label="Internal notes" rows={4} />
        </section>
      </form>
    </Form>
  )
}
