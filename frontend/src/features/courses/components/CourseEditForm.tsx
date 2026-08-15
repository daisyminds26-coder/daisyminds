import { formatEnumLabel } from '@/shared/lib/utils'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Form } from '@/shared/components/ui/form'
import { Separator } from '@/shared/components/ui/separator'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { TagsField } from '@/features/courses/components/TagsField'
import { EligibleTrainersField } from '@/features/courses/components/EligibleTrainersField'
import { useUpdateCourse } from '@/features/courses/hooks/use-update-course'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  COURSE_LEVELS,
  COURSE_VISIBILITIES,
  CURRENCY_CODES,
  DELIVERY_MODES,
  DURATION_UNITS,
  PRICING_TYPES,
} from '@/features/courses/types'
import {
  updateCourseSchema,
  type UpdateCourseFormValues,
} from '@/features/courses/schemas/course.schemas'
import type { UpdateCoursePayload } from '@/features/courses/api/courses.api'
import type { AdminCourse } from '@/features/courses/types'

function toDefaultValues(course: AdminCourse): UpdateCourseFormValues {
  return {
    title: course.title,
    shortDescription: course.shortDescription,
    description: course.description,
    category: course.category,
    subcategory: course.subcategory ?? '',
    level: course.level,
    language: course.language,
    secondaryLanguages: course.secondaryLanguages,
    tags: course.tags,
    durationValue: course.durationValue ? String(course.durationValue) : '',
    durationUnit: course.durationUnit ?? undefined,
    deliveryMode: course.deliveryMode,
    learningOutcomes: course.learningOutcomes,
    skills: course.skills,
    prerequisites: course.prerequisites,
    targetAudience: course.targetAudience ?? '',
    eligibilityCriteria: course.eligibilityCriteria ?? '',
    certificateEnabled: course.certificateEnabled,
    maxStudentCapacity: course.maxStudentCapacity ? String(course.maxStudentCapacity) : '',
    pricing: {
      pricingType: course.pricing.pricingType,
      currency: course.pricing.currency,
      basePrice: course.pricing.basePrice ? String(course.pricing.basePrice) : '',
      discountPrice: course.pricing.discountPrice ? String(course.pricing.discountPrice) : '',
      taxInclusive: course.pricing.taxInclusive,
      saleStartsAt: course.pricing.saleStartsAt ? new Date(course.pricing.saleStartsAt) : undefined,
      saleEndsAt: course.pricing.saleEndsAt ? new Date(course.pricing.saleEndsAt) : undefined,
    },
    visibility: course.visibility,
    isFeatured: course.isFeatured,
    featuredOrder: course.featuredOrder !== null ? String(course.featuredOrder) : '',
    metaTitle: course.metaTitle ?? '',
    metaDescription: course.metaDescription ?? '',
    canonicalUrl: course.canonicalUrl ?? '',
    eligibleTrainerIds: course.eligibleTrainerIds,
    internalNotes: course.internalNotes ?? '',
  }
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toPayload(values: UpdateCourseFormValues): UpdateCoursePayload {
  return {
    ...values,
    durationValue: toNumberOrUndefined(values.durationValue),
    maxStudentCapacity: toNumberOrUndefined(values.maxStudentCapacity),
    featuredOrder: toNumberOrUndefined(values.featuredOrder),
    pricing: {
      pricingType: values.pricing.pricingType ?? 'FREE',
      currency: values.pricing.currency ?? 'INR',
      basePrice: Number(values.pricing.basePrice ?? 0),
      discountPrice: toNumberOrUndefined(values.pricing.discountPrice),
      taxInclusive: values.pricing.taxInclusive ?? false,
      saleStartsAt: values.pricing.saleStartsAt?.toISOString(),
      saleEndsAt: values.pricing.saleEndsAt?.toISOString(),
    },
  }
}

export function CourseEditForm({ course, onDone }: { course: AdminCourse; onDone: () => void }) {
  const updateCourse = useUpdateCourse(course.id)
  const form = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: toDefaultValues(course),
  })

  useEffect(() => {
    form.reset(toDefaultValues(course))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when switching to a different course record
  }, [course.id])

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

  function onSubmit(values: UpdateCourseFormValues) {
    updateCourse.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Course updated')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not update course', getSafeErrorMessage(error))
      },
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- `watch()` is RHF's documented API for conditionally rendering fields based on another field's live value; the React Compiler's memoization skip is expected and harmless here (this whole form already re-renders on every keystroke via RHF's own subscription model)
  const pricingType = form.watch('pricing.pricingType')

  return (
    <Form {...form}>
      <form
        id="course-edit-form"
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Basic information</h3>
          <p className="text-caption text-muted-foreground">
            Course code <span className="font-mono">{course.courseCode}</span> (immutable)
          </p>
          <TextField control={form.control} name="title" label="Course title" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="category" label="Category" />
            <TextField control={form.control} name="subcategory" label="Subcategory" />
          </div>
          <TextField control={form.control} name="shortDescription" label="Short description" />
          <TextareaField control={form.control} name="description" label="Description" rows={5} />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Classification</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="level"
              label="Level"
              options={COURSE_LEVELS.map((value) => ({ value, label: formatEnumLabel(value) }))}
            />
            <SelectField
              control={form.control}
              name="deliveryMode"
              label="Delivery mode"
              options={DELIVERY_MODES.map((value) => ({ value, label: formatEnumLabel(value) }))}
            />
            <TextField control={form.control} name="durationValue" label="Duration" />
            <SelectField
              control={form.control}
              name="durationUnit"
              label="Duration unit"
              options={DURATION_UNITS.map((value) => ({ value, label: formatEnumLabel(value) }))}
            />
          </div>
          <TagsField control={form.control} name="secondaryLanguages" label="Secondary languages" />
          <TagsField control={form.control} name="tags" label="Tags" />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Learning details</h3>
          <TagsField control={form.control} name="learningOutcomes" label="Learning outcomes" />
          <TagsField control={form.control} name="skills" label="Skills gained" />
          <TagsField control={form.control} name="prerequisites" label="Prerequisites" />
          <TextField control={form.control} name="targetAudience" label="Target audience" />
          <TextField
            control={form.control}
            name="eligibilityCriteria"
            label="Eligibility criteria"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="maxStudentCapacity"
              label="Max student capacity"
            />
            <CheckboxField
              control={form.control}
              name="certificateEnabled"
              label="Certificate eligible"
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Pricing</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="pricing.pricingType"
              label="Pricing type"
              options={PRICING_TYPES.map((value) => ({ value, label: formatEnumLabel(value) }))}
            />
            <SelectField
              control={form.control}
              name="pricing.currency"
              label="Currency"
              options={CURRENCY_CODES.map((value) => ({ value, label: value }))}
            />
          </div>
          {pricingType === 'PAID' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="pricing.basePrice" label="Base price" />
                <TextField
                  control={form.control}
                  name="pricing.discountPrice"
                  label="Discount price"
                />
              </div>
              <CheckboxField
                control={form.control}
                name="pricing.taxInclusive"
                label="Price is tax-inclusive"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerField
                  control={form.control}
                  name="pricing.saleStartsAt"
                  label="Sale starts"
                />
                <DatePickerField
                  control={form.control}
                  name="pricing.saleEndsAt"
                  label="Sale ends"
                />
              </div>
            </>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Visibility &amp; settings</h3>
          <SelectField
            control={form.control}
            name="visibility"
            label="Visibility"
            options={COURSE_VISIBILITIES.map((value) => ({
              value,
              label: formatEnumLabel(value),
            }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CheckboxField control={form.control} name="isFeatured" label="Featured course" />
            <TextField control={form.control} name="featuredOrder" label="Featured order" />
          </div>
          <TextareaField
            control={form.control}
            name="internalNotes"
            label="Internal notes"
            rows={3}
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">Trainer eligibility</h3>
          <EligibleTrainersField
            control={form.control}
            name="eligibleTrainerIds"
            label="Eligible trainers"
            description="Metadata only — does not assign a trainer to this course."
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-body-sm font-semibold">SEO</h3>
          <TextField control={form.control} name="metaTitle" label="Meta title" />
          <TextareaField
            control={form.control}
            name="metaDescription"
            label="Meta description"
            rows={2}
          />
          <TextField control={form.control} name="canonicalUrl" label="Canonical URL" />
        </section>
      </form>
    </Form>
  )
}
