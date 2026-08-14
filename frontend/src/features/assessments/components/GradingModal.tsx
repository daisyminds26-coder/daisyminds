import { useState } from 'react'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  AttemptStatusBadge,
  PassStatusBadge,
} from '@/features/assessments/components/AttemptStatusBadge'
import { QuestionTypeBadge } from '@/features/question-bank/components/QuestionTypeBadge'
import type {
  AttemptQuestion,
  GradeEntryPayload,
  GraderAttempt,
} from '@/features/assessments/types'

function optionLabel(question: AttemptQuestion, optionId: string): string {
  return question.options.find((option) => option.id === optionId)?.text ?? optionId
}

function studentAnswerSummary(question: AttemptQuestion): string {
  if (question.selectedOptionIds.length > 0) {
    return question.selectedOptionIds.map((id) => optionLabel(question, id)).join(', ')
  }
  if (question.booleanAnswer !== null) return question.booleanAnswer ? 'True' : 'False'
  if (question.numericAnswer !== null) return String(question.numericAnswer)
  if (question.textAnswer) return question.textAnswer
  return 'Not answered'
}

function correctAnswerSummary(question: AttemptQuestion): string | null {
  if (question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTIPLE_CHOICE') {
    const correct = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.text)
    return correct.length > 0 ? correct.join(', ') : null
  }
  if (question.questionType === 'TRUE_FALSE') {
    return question.correctBoolean === null || question.correctBoolean === undefined
      ? null
      : question.correctBoolean
        ? 'True'
        : 'False'
  }
  if (question.questionType === 'NUMERIC') {
    return question.correctNumericAnswer === null || question.correctNumericAnswer === undefined
      ? null
      : String(question.correctNumericAnswer)
  }
  if (question.questionType === 'FILL_IN_THE_BLANK' && question.acceptedAnswers?.length) {
    return question.acceptedAnswers.join(', ')
  }
  return null
}

interface GradingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attempt: GraderAttempt | null
  isGrading?: boolean
  onGrade: (grades: GradeEntryPayload[]) => void
}

/** The grading workspace — response review + subjective marks/feedback entry. Shared by admin and trainer detail pages, same "one shared component" pattern the Assignments module established. Keyed by attempt id at the call site so local state resets cleanly per attempt (never a `useEffect`-based sync). */
export function GradingModal({
  open,
  onOpenChange,
  attempt,
  isGrading = false,
  onGrade,
}: GradingModalProps) {
  const [drafts, setDrafts] = useState<Map<string, { marksAwarded: string; feedback: string }>>(
    () =>
      new Map(
        (attempt?.questions ?? [])
          .filter((question) => question.requiresManualGrading)
          .map((question) => [
            question.questionId,
            {
              marksAwarded:
                question.marksAwarded !== null && question.marksAwarded !== undefined
                  ? String(question.marksAwarded)
                  : '',
              feedback: question.manualFeedback ?? '',
            },
          ]),
      ),
  )

  if (!attempt) return null

  function updateDraft(
    questionId: string,
    patch: Partial<{ marksAwarded: string; feedback: string }>,
  ) {
    setDrafts((prev) => {
      const next = new Map(prev)
      const current = next.get(questionId) ?? { marksAwarded: '', feedback: '' }
      next.set(questionId, { ...current, ...patch })
      return next
    })
  }

  function handleSave() {
    const grades: GradeEntryPayload[] = []
    for (const [questionId, draft] of drafts) {
      if (draft.marksAwarded.trim() === '') continue
      const marksAwarded = Number(draft.marksAwarded)
      if (Number.isNaN(marksAwarded)) continue
      grades.push({ questionId, marksAwarded, feedback: draft.feedback.trim() || undefined })
    }
    if (grades.length > 0) onGrade(grades)
  }

  const hasDraftsToSave = [...drafts.values()].some((draft) => draft.marksAwarded.trim() !== '')

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${attempt.studentName} — Attempt ${String(attempt.attemptNumber)}`}
      description={`${attempt.assessmentTitle} · ${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'Not submitted'}`}
      className="sm:max-w-3xl"
    >
      <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <AttemptStatusBadge status={attempt.status} />
          {attempt.passStatus && <PassStatusBadge status={attempt.passStatus} />}
          {attempt.totalMarksAwarded !== null && (
            <span className="text-body-sm text-muted-foreground">
              {attempt.totalMarksAwarded} / {attempt.totalMarks} ({attempt.percentage}%)
            </span>
          )}
        </div>

        {attempt.questions.map((question, index) => {
          const correct = correctAnswerSummary(question)
          const draft = drafts.get(question.questionId)
          return (
            <div
              key={question.questionId}
              className="border-border flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-caption text-muted-foreground">Q{index + 1}</span>
                <QuestionTypeBadge type={question.questionType} />
                <span className="text-caption text-muted-foreground">{question.marks} marks</span>
                {question.isCorrect !== null && question.isCorrect !== undefined && (
                  <Badge
                    variant="outline"
                    className={question.isCorrect ? 'text-success' : 'text-destructive'}
                  >
                    {question.isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                )}
              </div>
              <p className="text-body-sm whitespace-pre-wrap">{question.questionText}</p>
              <div className="text-body-sm">
                <span className="text-muted-foreground">Answer: </span>
                {studentAnswerSummary(question)}
              </div>
              {correct && (
                <div className="text-body-sm">
                  <span className="text-muted-foreground">Correct answer: </span>
                  {correct}
                </div>
              )}

              {question.requiresManualGrading && (
                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`marks-${question.questionId}`}>
                      Marks awarded (of {question.marks})
                    </Label>
                    <Input
                      id={`marks-${question.questionId}`}
                      type="number"
                      min={0}
                      max={question.marks}
                      value={draft?.marksAwarded ?? ''}
                      onChange={(event) => {
                        updateDraft(question.questionId, { marksAwarded: event.target.value })
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`feedback-${question.questionId}`}>Feedback (optional)</Label>
                    <Textarea
                      id={`feedback-${question.questionId}`}
                      rows={1}
                      value={draft?.feedback ?? ''}
                      onChange={(event) => {
                        updateDraft(question.questionId, { feedback: event.target.value })
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex justify-end">
          <Button type="button" disabled={isGrading || !hasDraftsToSave} onClick={handleSave}>
            {isGrading ? 'Saving…' : 'Save grades'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
