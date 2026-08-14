import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { TextField } from '@/shared/components/forms/text-field'
import { TextareaField } from '@/shared/components/forms/textarea-field'
import { SelectField } from '@/shared/components/forms/select-field'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCoursesList } from '@/features/courses/hooks/use-courses-list'
import {
  useCreateQuestion,
  useUpdateQuestion,
} from '@/features/question-bank/hooks/use-question-mutations'
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from '@/features/question-bank/types'
import { QUESTION_TYPE_LABEL } from '@/features/question-bank/components/QuestionTypeBadge'
import type { AdminQuestion, CreateQuestionPayload } from '@/features/question-bank/types'

/** Plain regex-validated string, converted with `Number(...)` only at submit time — `z.coerce.number()` breaks `useForm<T>()`'s `Control<T>` inference (see `features/students/schemas/student.schemas.ts`'s own documented rationale). */
function numericString(message: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, message)
}

const optionSchema = z.object({
  text: z.string().trim().min(1, 'Option text is required').max(1000),
  isCorrect: z.boolean(),
})

const formSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  questionType: z.enum(QUESTION_TYPES),
  difficulty: z.union([z.enum(QUESTION_DIFFICULTIES), z.literal('')]),
  questionText: z.string().trim().min(1, 'Question text is required').max(5000),
  explanation: z.string().trim().max(3000),
  marks: numericString('Enter a valid number of marks'),
  negativeMarks: z.union([numericString('Enter a valid number'), z.literal('')]),
  options: z.array(optionSchema).max(10),
  correctBoolean: z.union([z.literal('true'), z.literal('false'), z.literal('')]),
  acceptedAnswers: z.string().trim().max(1000),
  correctNumericAnswer: z.union([numericString('Enter a valid number'), z.literal('')]),
  tags: z.string().trim().max(400),
})

type FormValues = z.input<typeof formSchema>

interface QuestionFormProps {
  existing?: AdminQuestion
}

function defaultOptionsFor(existing: AdminQuestion | undefined): FormValues['options'] {
  if (existing && existing.options.length > 0) {
    return existing.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect }))
  }
  return [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]
}

export function QuestionForm({ existing }: QuestionFormProps) {
  const navigate = useNavigate()
  const coursesQuery = useCoursesList({ page: 1, limit: 100, status: 'PUBLISHED' })
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion(existing?.id ?? '')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: existing?.courseId ?? '',
      questionType: existing?.questionType ?? 'SINGLE_CHOICE',
      difficulty: existing?.difficulty ?? '',
      questionText: existing?.questionText ?? '',
      explanation: existing?.explanation ?? '',
      marks: existing ? String(existing.marks) : '1',
      negativeMarks:
        existing?.negativeMarks !== null && existing?.negativeMarks !== undefined
          ? String(existing.negativeMarks)
          : '',
      options: defaultOptionsFor(existing),
      correctBoolean:
        existing?.correctBoolean === null || existing?.correctBoolean === undefined
          ? ''
          : existing.correctBoolean
            ? 'true'
            : 'false',
      acceptedAnswers: existing?.acceptedAnswers.join(', ') ?? '',
      correctNumericAnswer:
        existing?.correctNumericAnswer !== null && existing?.correctNumericAnswer !== undefined
          ? String(existing.correctNumericAnswer)
          : '',
      tags: existing?.tags.join(', ') ?? '',
    },
  })

  const optionsArray = useFieldArray({ control: form.control, name: 'options' })
  const questionType = form.watch('questionType')
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE'

  function handleSubmit(values: FormValues) {
    const payload: CreateQuestionPayload = {
      courseId: values.courseId,
      questionType: values.questionType,
      difficulty: values.difficulty === '' ? undefined : values.difficulty,
      questionText: values.questionText,
      explanation: values.explanation === '' ? undefined : values.explanation,
      marks: Number(values.marks),
      negativeMarks: values.negativeMarks === '' ? undefined : Number(values.negativeMarks),
      options: isChoiceType ? values.options : undefined,
      correctBoolean: values.correctBoolean === '' ? undefined : values.correctBoolean === 'true',
      acceptedAnswers:
        questionType === 'FILL_IN_THE_BLANK'
          ? values.acceptedAnswers
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
          : undefined,
      correctNumericAnswer:
        values.correctNumericAnswer === '' ? undefined : Number(values.correctNumericAnswer),
      tags: values.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }

    const mutation = existing ? updateQuestion : createQuestion
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(existing ? 'Question updated' : 'Question created')
        void navigate('/admin/question-bank')
      },
      onError: (error) => {
        toast.error(
          existing ? 'Could not update question' : 'Could not create question',
          getSafeErrorMessage(error),
        )
      },
    })
  }

  const isPending = createQuestion.isPending || updateQuestion.isPending

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="courseId"
            label="Course"
            options={(coursesQuery.data?.data ?? []).map((course) => ({
              value: course.id,
              label: course.title,
            }))}
          />
          <SelectField
            control={form.control}
            name="questionType"
            label="Question type"
            options={QUESTION_TYPES.map((value) => ({ value, label: QUESTION_TYPE_LABEL[value] }))}
          />
          <SelectField
            control={form.control}
            name="difficulty"
            label="Difficulty"
            placeholder="Not set"
            options={QUESTION_DIFFICULTIES.map((value) => ({ value, label: value }))}
          />
          <TextField control={form.control} name="marks" label="Marks" />
          <TextField
            control={form.control}
            name="negativeMarks"
            label="Negative marks (optional)"
            description="Applied only when the assessment has negative marking enabled"
          />
          <TextField control={form.control} name="tags" label="Tags (comma separated)" />
          <div className="sm:col-span-2">
            <TextareaField
              control={form.control}
              name="questionText"
              label="Question text"
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              control={form.control}
              name="explanation"
              label="Explanation (optional)"
              rows={2}
              description="Shown to the student only after their result is visible"
            />
          </div>
        </CardContent>
      </Card>

      {isChoiceType && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Label>Options</Label>
            {optionsArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3">
                <Checkbox
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, react-hooks/incompatible-library -- RHF's FieldPath type requires a literal `options.${number}.isCorrect` template (not a stringified index); `watch()` is RHF's documented API, see `CreateEnrollllmentWizard.tsx`'s identical comment
                  checked={form.watch(`options.${index}.isCorrect`)}
                  onCheckedChange={(checked) => {
                    if (questionType === 'SINGLE_CHOICE' && checked) {
                      optionsArray.fields.forEach((_, otherIndex) => {
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- see the `watch()` call above
                        form.setValue(`options.${otherIndex}.isCorrect`, otherIndex === index)
                      })
                    } else {
                      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- see the `watch()` call above
                      form.setValue(`options.${index}.isCorrect`, checked === true)
                    }
                  }}
                  aria-label={`Option ${String(index + 1)} is correct`}
                />
                <Input
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- see the `watch()` call above
                  {...form.register(`options.${index}.text`)}
                  placeholder={`Option ${String(index + 1)}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove option ${String(index + 1)}`}
                  disabled={optionsArray.fields.length <= 2}
                  onClick={() => {
                    optionsArray.remove(index)
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              disabled={optionsArray.fields.length >= 10}
              onClick={() => {
                optionsArray.append({ text: '', isCorrect: false })
              }}
            >
              <Plus className="size-3.5" />
              Add option
            </Button>
            <p className="text-caption text-muted-foreground">
              {questionType === 'SINGLE_CHOICE'
                ? 'Exactly one option must be marked correct.'
                : 'Mark every correct option — grading is all-or-nothing.'}
            </p>
          </CardContent>
        </Card>
      )}

      {questionType === 'TRUE_FALSE' && (
        <Card>
          <CardContent className="pt-6">
            <SelectField
              control={form.control}
              name="correctBoolean"
              label="Correct answer"
              options={[
                { value: 'true', label: 'True' },
                { value: 'false', label: 'False' },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {questionType === 'FILL_IN_THE_BLANK' && (
        <Card>
          <CardContent className="pt-6">
            <TextField
              control={form.control}
              name="acceptedAnswers"
              label="Accepted answers (comma separated, optional)"
              description="Leave empty for manual grading — set this to auto-grade on an exact (case-insensitive) match"
            />
          </CardContent>
        </Card>
      )}

      {questionType === 'NUMERIC' && (
        <Card>
          <CardContent className="pt-6">
            <TextField
              control={form.control}
              name="correctNumericAnswer"
              label="Correct numeric answer"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate('/admin/question-bank')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : existing ? 'Save changes' : 'Create question'}
        </Button>
      </div>
    </form>
  )
}
