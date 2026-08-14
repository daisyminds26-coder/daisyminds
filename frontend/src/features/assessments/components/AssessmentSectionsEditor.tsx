import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { QuestionPickerDialog } from '@/features/assessments/components/QuestionPickerDialog'
import { useReplaceSections } from '@/features/assessments/hooks/use-assessment-mutations'
import type {
  AdminAssessment,
  AdminAssessmentSection,
  SectionInputPayload,
} from '@/features/assessments/types'
import type { AdminQuestion } from '@/features/question-bank/types'

interface EditableSection {
  key: string
  title: string
  instructions: string
  randomQuestionCount: string
  questions: AdminAssessmentSection['questions']
}

function toEditable(sections: AdminAssessmentSection[]): EditableSection[] {
  if (sections.length === 0) {
    return [
      {
        key: crypto.randomUUID(),
        title: '',
        instructions: '',
        randomQuestionCount: '',
        questions: [],
      },
    ]
  }
  return sections.map((section) => ({
    key: section.id,
    title: section.title,
    instructions: section.instructions ?? '',
    randomQuestionCount: section.randomQuestionCount ? String(section.randomQuestionCount) : '',
    questions: section.questions,
  }))
}

interface AssessmentSectionsEditorProps {
  assessment: AdminAssessment
}

export function AssessmentSectionsEditor({ assessment }: AssessmentSectionsEditorProps) {
  const [sections, setSections] = useState<EditableSection[]>(() => toEditable(assessment.sections))
  const [pickerForSection, setPickerForSection] = useState<string | null>(null)
  const replaceSections = useReplaceSections(assessment.id)

  const editable = assessment.status === 'DRAFT'
  const allQuestionIds = sections.flatMap((section) =>
    section.questions.map((question) => question.id),
  )

  function updateSection(key: string, patch: Partial<EditableSection>) {
    setSections((prev) =>
      prev.map((section) => (section.key === key ? { ...section, ...patch } : section)),
    )
  }

  function handleSave() {
    const payload: SectionInputPayload[] = sections.map((section, index) => ({
      title: section.title,
      instructions: section.instructions || undefined,
      order: index,
      questionIds: section.questions.map((question) => question.id),
      randomQuestionCount: section.randomQuestionCount
        ? Number(section.randomQuestionCount)
        : undefined,
    }))

    replaceSections.mutate(payload, {
      onSuccess: () => toast.success('Sections saved'),
      onError: (error) => toast.error('Could not save sections', getSafeErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {!editable && (
        <p className="text-body-sm text-muted-foreground">
          Sections can only be edited while the assessment is a DRAFT.
        </p>
      )}
      {sections.map((section, sectionIndex) => (
        <Card key={section.key}>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${section.key}-title`}>Section title (optional)</Label>
                  <Input
                    id={`${section.key}-title`}
                    value={section.title}
                    disabled={!editable}
                    onChange={(event) => {
                      updateSection(section.key, { title: event.target.value })
                    }}
                    placeholder={`Section ${String(sectionIndex + 1)}`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${section.key}-random`}>
                    Random question count (optional — leave empty to use all)
                  </Label>
                  <Input
                    id={`${section.key}-random`}
                    value={section.randomQuestionCount}
                    disabled={!editable}
                    onChange={(event) => {
                      updateSection(section.key, { randomQuestionCount: event.target.value })
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`${section.key}-instructions`}>
                    Section instructions (optional)
                  </Label>
                  <Textarea
                    id={`${section.key}-instructions`}
                    rows={2}
                    value={section.instructions}
                    disabled={!editable}
                    onChange={(event) => {
                      updateSection(section.key, { instructions: event.target.value })
                    }}
                  />
                </div>
              </div>
              {editable && (
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move section up"
                    disabled={sectionIndex === 0}
                    onClick={() => {
                      setSections((prev) => {
                        const next = [...prev]
                        const [moved] = next.splice(sectionIndex, 1)
                        if (moved) next.splice(sectionIndex - 1, 0, moved)
                        return next
                      })
                    }}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move section down"
                    disabled={sectionIndex === sections.length - 1}
                    onClick={() => {
                      setSections((prev) => {
                        const next = [...prev]
                        const [moved] = next.splice(sectionIndex, 1)
                        if (moved) next.splice(sectionIndex + 1, 0, moved)
                        return next
                      })
                    }}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove section"
                    disabled={sections.length <= 1}
                    className="text-destructive"
                    onClick={() => {
                      setSections((prev) => prev.filter((item) => item.key !== section.key))
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="border-border divide-border divide-y rounded-lg border">
              {section.questions.length === 0 ? (
                <p className="text-body-sm text-muted-foreground p-3">No questions added yet.</p>
              ) : (
                section.questions.map((question) => (
                  <div key={question.id} className="flex items-center justify-between gap-3 p-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-sm line-clamp-1">{question.questionText}</span>
                      <span className="text-caption text-muted-foreground">
                        {question.questionCode} · {question.marks} marks
                      </span>
                    </div>
                    {editable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${question.questionText}`}
                        onClick={() => {
                          updateSection(section.key, {
                            questions: section.questions.filter((item) => item.id !== question.id),
                          })
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {editable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() => {
                  setPickerForSection(section.key)
                }}
              >
                <Plus className="size-3.5" />
                Add questions
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {editable && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-1.5"
            onClick={() => {
              setSections((prev) => [
                ...prev,
                {
                  key: crypto.randomUUID(),
                  title: '',
                  instructions: '',
                  randomQuestionCount: '',
                  questions: [],
                },
              ])
            }}
          >
            <Plus className="size-3.5" />
            Add section
          </Button>
          <Button type="button" disabled={replaceSections.isPending} onClick={handleSave}>
            {replaceSections.isPending ? 'Saving…' : 'Save sections'}
          </Button>
        </div>
      )}

      {pickerForSection && (
        <QuestionPickerDialog
          open
          onOpenChange={(open) => {
            if (!open) setPickerForSection(null)
          }}
          courseId={assessment.courseId}
          excludeIds={allQuestionIds}
          onConfirm={(questions: AdminQuestion[]) => {
            updateSection(pickerForSection, {
              questions: [
                ...(sections.find((s) => s.key === pickerForSection)?.questions ?? []),
                ...questions.map((question) => ({
                  id: question.id,
                  questionCode: question.questionCode,
                  questionText: question.questionText,
                  questionType: question.questionType,
                  marks: question.marks,
                })),
              ],
            })
          }}
        />
      )}
    </div>
  )
}
