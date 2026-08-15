import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FileEdit } from 'lucide-react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { cn, formatEnumLabel } from '@/shared/lib/utils'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { CheckboxField } from '@/shared/components/forms/checkbox-field'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  useCreateLesson,
  useUpdateLesson,
} from '@/features/courses/curriculum/hooks/use-lesson-mutations'
import {
  PrerequisiteLessonsField,
  type PrerequisiteCandidate,
} from '@/features/courses/curriculum/components/PrerequisiteLessonsField'
import {
  lessonFormSchema,
  type LessonFormValues,
} from '@/features/courses/curriculum/schemas/curriculum.schemas'
import { LESSON_TYPES, type CurriculumLesson } from '@/features/courses/curriculum/types'

interface LessonFormDrawerProps {
  courseId: string
  moduleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit mode; absent → create mode. */
  lesson?: CurriculumLesson
  /** Every other lesson in the course, for the prerequisite picker — self already excluded by the caller. */
  candidates: readonly PrerequisiteCandidate[]
}

const DEFAULT_VALUES: LessonFormValues = {
  title: '',
  shortDescription: '',
  lessonType: 'VIDEO',
  estimatedDurationMinutes: '',
  isPreview: false,
  isMandatory: true,
  prerequisiteLessonIds: [],
}

export function LessonFormDrawer({
  courseId,
  moduleId,
  open,
  onOpenChange,
  lesson,
  candidates,
}: LessonFormDrawerProps) {
  const isEdit = !!lesson
  const createLesson = useCreateLesson(courseId)
  const updateLesson = useUpdateLesson(courseId)
  const isPending = createLesson.isPending || updateLesson.isPending

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      lesson
        ? {
            title: lesson.title,
            shortDescription: lesson.shortDescription,
            lessonType: lesson.lessonType,
            estimatedDurationMinutes: lesson.estimatedDurationMinutes
              ? String(lesson.estimatedDurationMinutes)
              : '',
            isPreview: lesson.isPreview,
            isMandatory: lesson.isMandatory,
            prerequisiteLessonIds: lesson.prerequisiteLessonIds,
          }
        : DEFAULT_VALUES,
    )
  }, [open, lesson, form])

  function close() {
    onOpenChange(false)
  }

  function onSubmit(values: LessonFormValues) {
    const payload = {
      title: values.title,
      shortDescription: values.shortDescription,
      lessonType: values.lessonType,
      estimatedDurationMinutes: values.estimatedDurationMinutes
        ? Number(values.estimatedDurationMinutes)
        : undefined,
      isPreview: values.isPreview ?? false,
      isMandatory: values.isMandatory ?? true,
      prerequisiteLessonIds: values.prerequisiteLessonIds ?? [],
    }

    if (isEdit) {
      updateLesson.mutate(
        { moduleId, lessonId: lesson.id, payload },
        {
          onSuccess: () => {
            toast.success('Lesson updated')
            close()
          },
          onError: (error) => toast.error('Could not update lesson', getSafeErrorMessage(error)),
        },
      )
    } else {
      createLesson.mutate(
        { moduleId, payload },
        {
          onSuccess: () => {
            toast.success('Lesson added')
            close()
          },
          onError: (error) => toast.error('Could not create lesson', getSafeErrorMessage(error)),
        },
      )
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit lesson' : 'Add lesson'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="lesson-form" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add lesson'}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="lesson-form"
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField control={form.control} name="title" label="Title" />
          <TextareaField
            control={form.control}
            name="shortDescription"
            label="Short description"
            rows={3}
          />
          <SelectField
            control={form.control}
            name="lessonType"
            label="Lesson type"
            options={LESSON_TYPES.map((value) => ({ value, label: formatEnumLabel(value) }))}
          />
          <TextField
            control={form.control}
            name="estimatedDurationMinutes"
            label="Estimated duration (minutes)"
          />
          <CheckboxField
            control={form.control}
            name="isMandatory"
            label="Mandatory"
            description="Uncheck for an optional/supplementary lesson."
          />
          <CheckboxField
            control={form.control}
            name="isPreview"
            label="Free preview"
            description="Visible to prospective students once a public catalog exists."
          />
          <PrerequisiteLessonsField
            control={form.control}
            name="prerequisiteLessonIds"
            candidates={candidates}
          />
          {lesson ? (
            <Link
              to={`/admin/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${lesson.id}/content`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-fit gap-1.5')}
            >
              <FileEdit className="size-3.5" />
              Edit content
            </Link>
          ) : (
            <Alert>
              <AlertDescription>
                Save this lesson first, then use "Edit content" to add its video, text, document, or
                link.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </Drawer>
  )
}
