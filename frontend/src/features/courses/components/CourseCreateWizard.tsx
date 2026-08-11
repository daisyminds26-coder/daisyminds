import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Stepper, type StepperStep } from '@/shared/components/data-display/stepper'
import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { TextField } from '@/shared/components/forms/text-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { DatePickerField } from '@/shared/components/forms/date-picker-field'
import { TagsField } from '@/features/courses/components/TagsField'
import { EligibleTrainersField } from '@/features/courses/components/EligibleTrainersField'
import { useCreateCourse } from '@/features/courses/hooks/use-create-course'
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
  createCourseSchema,
  type CreateCourseFormValues,
} from '@/features/courses/schemas/course.schemas'
import type { CreateCoursePayload } from '@/features/courses/api/courses.api'

const STEPS: StepperStep[] = [
  { id: 'basic', label: 'Basic info' },
  { id: 'classification', label: 'Classification' },
  { id: 'learning', label: 'Learning details' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'trainers', label: 'Trainer eligibility' },
  { id: 'media', label: 'Media' },
  { id: 'seo', label: 'SEO' },
  { id: 'review', label: 'Review' },
]

const DEFAULT_VALUES: CreateCourseFormValues = {
  title: '',
  shortTitle: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: '',
  subcategory: '',
  level: 'BEGINNER',
  language: 'en',
  secondaryLanguages: [],
  tags: [],
  durationValue: '',
  durationUnit: undefined,
  deliveryMode: 'ONLINE',
  learningOutcomes: [],
  skills: [],
  prerequisites: [],
  targetAudience: '',
  eligibilityCriteria: '',
  certificateEnabled: false,
  maxStudentCapacity: '',
  pricing: {
    pricingType: 'FREE',
    currency: 'INR',
    basePrice: '',
    discountPrice: '',
    taxInclusive: false,
  },
  visibility: 'PRIVATE',
  isFeatured: false,
  featuredOrder: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  eligibleTrainerIds: [],
  internalNotes: '',
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toPayload(values: CreateCourseFormValues): CreateCoursePayload {
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

export function CourseCreateWizard({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const createCourse = useCreateCourse()
  const form = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const isFirstStep = stepIndex === 0

  const STEP_FIELDS: Record<string, (keyof CreateCourseFormValues)[]> = {
    basic: ['title', 'category'],
    classification: ['level', 'deliveryMode', 'durationUnit'],
    learning: [],
    pricing: ['pricing'],
    visibility: [],
    trainers: [],
    media: [],
    seo: [],
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

  function onSubmit(values: CreateCourseFormValues) {
    createCourse.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success('Course created')
        onDone()
      },
      onError: (error) => {
        toast.error('Could not create course', getSafeErrorMessage(error))
      },
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- `watch()` is RHF's documented API for conditionally rendering fields based on another field's live value; the React Compiler's memoization skip is expected and harmless here (this whole form already re-renders on every keystroke via RHF's own subscription model)
  const pricingType = form.watch('pricing.pricingType')

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <Stepper steps={STEPS} currentStepId={currentStep?.id ?? 'basic'} />

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          {currentStep?.id === 'basic' && (
            <div className="flex flex-col gap-4">
              <TextField control={form.control} name="title" label="Course title" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="shortTitle" label="Short title" />
                <TextField
                  control={form.control}
                  name="slug"
                  label="Slug"
                  description="Leave blank to auto-generate from the title."
                />
                <TextField control={form.control} name="category" label="Category" />
                <TextField control={form.control} name="subcategory" label="Subcategory" />
              </div>
              <TextField control={form.control} name="shortDescription" label="Short description" />
              <TextareaField
                control={form.control}
                name="description"
                label="Description"
                rows={5}
              />
            </div>
          )}

          {currentStep?.id === 'classification' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="level"
                  label="Level"
                  options={COURSE_LEVELS.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <SelectField
                  control={form.control}
                  name="deliveryMode"
                  label="Delivery mode"
                  options={DELIVERY_MODES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
                <TextField control={form.control} name="language" label="Primary language" />
                <TextField control={form.control} name="durationValue" label="Duration" />
                <SelectField
                  control={form.control}
                  name="durationUnit"
                  label="Duration unit"
                  options={DURATION_UNITS.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
                />
              </div>
              <TagsField
                control={form.control}
                name="secondaryLanguages"
                label="Secondary languages"
              />
              <TagsField control={form.control} name="tags" label="Tags" />
            </div>
          )}

          {currentStep?.id === 'learning' && (
            <div className="flex flex-col gap-4">
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
                  description="Whether completing this course can result in a certificate (future module)."
                />
              </div>
            </div>
          )}

          {currentStep?.id === 'pricing' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="pricing.pricingType"
                  label="Pricing type"
                  options={PRICING_TYPES.map((value) => ({
                    value,
                    label: value.replace(/_/g, ' '),
                  }))}
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
              {pricingType === 'FREE' && (
                <p className="text-body-sm text-muted-foreground">
                  Free courses have no price fields — any values entered here are cleared on save.
                </p>
              )}
            </div>
          )}

          {currentStep?.id === 'visibility' && (
            <div className="flex flex-col gap-4">
              <SelectField
                control={form.control}
                name="visibility"
                label="Visibility"
                options={COURSE_VISIBILITIES.map((value) => ({
                  value,
                  label: value.replace(/_/g, ' '),
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
            </div>
          )}

          {currentStep?.id === 'trainers' && (
            <EligibleTrainersField
              control={form.control}
              name="eligibleTrainerIds"
              label="Eligible trainers"
              description="Metadata only — does not assign a trainer to this course or create a batch/schedule."
            />
          )}

          {currentStep?.id === 'media' && (
            <p className="text-body-sm text-muted-foreground">
              Thumbnail and banner images can be uploaded once the course is created — open it from
              the course list afterward.
            </p>
          )}

          {currentStep?.id === 'seo' && (
            <div className="flex flex-col gap-4">
              <TextField
                control={form.control}
                name="metaTitle"
                label="Meta title"
                description="Up to 70 characters."
              />
              <TextareaField
                control={form.control}
                name="metaDescription"
                label="Meta description"
                rows={2}
                description="Up to 160 characters."
              />
              <TextField control={form.control} name="canonicalUrl" label="Canonical URL" />
            </div>
          )}

          {currentStep?.id === 'review' && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Title:</span> {form.getValues('title')}
              </p>
              <p>
                <span className="font-medium">Category:</span> {form.getValues('category')}
              </p>
              <p>
                <span className="font-medium">Level:</span> {form.getValues('level')}
              </p>
              <p>
                <span className="font-medium">Pricing:</span>{' '}
                {form.getValues('pricing.pricingType') === 'FREE'
                  ? 'Free'
                  : `${form.getValues('pricing.currency') ?? 'INR'} ${form.getValues('pricing.basePrice') ?? '0'}`}
              </p>
              <p className="text-muted-foreground">
                The course is created as a Draft — publish it once you're ready.
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={createCourse.isPending}>
                {createCourse.isPending ? 'Creating…' : 'Create course'}
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
