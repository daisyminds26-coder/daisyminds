import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flag, ListChecks } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { ExamTimer } from '@/features/student-assessments/components/ExamTimer'
import { QuestionPalette } from '@/features/student-assessments/components/QuestionPalette'
import { QuestionRenderer } from '@/features/student-assessments/components/QuestionRenderer'
import {
  useRecordFocusLoss,
  useSaveAnswers,
  useSubmitAttempt,
} from '@/features/student-assessments/hooks/use-attempt'
import type { AnswerEntryPayload, StudentAttempt } from '@/features/student-assessments/types'
import type { AttemptQuestion } from '@/features/assessments/types'

const AUTOSAVE_DEBOUNCE_MS = 2000

function toPayload(question: AttemptQuestion): AnswerEntryPayload {
  return {
    questionId: question.questionId,
    selectedOptionIds: question.selectedOptionIds,
    booleanAnswer: question.booleanAnswer ?? undefined,
    textAnswer: question.textAnswer ?? undefined,
    numericAnswer: question.numericAnswer ?? undefined,
    flaggedForReview: question.flaggedForReview,
  }
}

interface ExamPlayerProps {
  attempt: StudentAttempt
  onSubmitted: () => void
}

/**
 * Distraction-free exam shell — no dashboard chrome (sidebar/topbar) is
 * rendered here, matching the task's own "do not nest heavy normal student
 * dashboard chrome during exam" instruction. Mounted fresh per attempt via
 * the caller's `key={attempt.id}` (never re-initialized mid-mount from a
 * `useEffect`), so local state is always seeded once from the server's own
 * already-saved answers — this IS the "exam recovery" resume path: a page
 * refresh re-fetches the attempt and remounts this component with whatever
 * was last autosaved.
 */
export function ExamPlayer({ attempt, onSubmitted }: ExamPlayerProps) {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<AttemptQuestion[]>(attempt.questions)
  const [currentIndex, setCurrentIndex] = useState(0)
  const pendingRef = useRef<Map<string, AnswerEntryPayload>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSubmittedRef = useRef(false)

  const saveAnswers = useSaveAnswers(attempt.id)
  const submitAttempt = useSubmitAttempt(attempt.id)
  const recordFocusLoss = useRecordFocusLoss(attempt.id)

  const current = questions[currentIndex]

  function flush() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (pendingRef.current.size === 0) return
    const payload = [...pendingRef.current.values()]
    pendingRef.current.clear()
    saveAnswers.mutate(payload)
  }

  function handleAnswerChange(questionId: string, patch: Partial<AnswerEntryPayload>) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.questionId === questionId ? { ...question, ...patch } : question,
      ),
    )
    const updated = questions.find((question) => question.questionId === questionId)
    if (!updated) return
    pendingRef.current.set(questionId, toPayload({ ...updated, ...patch }))

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS)
  }

  function goTo(index: number) {
    flush()
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1))
  }

  async function handleSubmit(isAutoSubmit: boolean) {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    flush()
    try {
      if (saveAnswers.isPending) await saveAnswers.mutateAsync([...pendingRef.current.values()])
      await submitAttempt.mutateAsync()
      if (isAutoSubmit) toast.info('Time is up — your attempt was submitted automatically.')
      else toast.success('Attempt submitted')
      onSubmitted()
    } catch (error) {
      hasSubmittedRef.current = false
      toast.error('Could not submit your attempt', getSafeErrorMessage(error))
    }
  }

  useEffect(() => {
    function handleBlur() {
      recordFocusLoss.mutate()
    }
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('blur', handleBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire-and-forget audit signal, intentionally not re-subscribing on every mutation-state change
  }, [])

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (pendingRef.current.size > 0) {
        flush()
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads pendingRef at fire time, not a reactive dependency
  }, [])

  if (!current) return null

  const answeredCount = questions.filter(
    (question) =>
      question.selectedOptionIds.length > 0 ||
      question.booleanAnswer !== null ||
      question.numericAnswer !== null ||
      Boolean(question.textAnswer?.trim()),
  ).length

  const palette = (
    <QuestionPalette
      questions={questions}
      currentIndex={currentIndex}
      onSelect={(index) => {
        goTo(index)
      }}
    />
  )

  return (
    <div className="bg-background fixed inset-0 z-40 flex flex-col">
      <header className="border-border bg-surface flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button
            type="button"
            className="text-caption text-muted-foreground w-fit underline"
            onClick={() => {
              flush()
              void navigate(-1)
            }}
          >
            Save &amp; exit
          </button>
          <span className="text-body-sm truncate font-semibold">{attempt.assessmentTitle}</span>
          <span className="text-caption text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExamTimer
            expiresAt={attempt.expiresAt}
            onExpire={() => {
              void handleSubmit(true)
            }}
          />
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Open question palette"
                >
                  <ListChecks className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Questions</SheetTitle>
                </SheetHeader>
                <div className="p-4">{palette}</div>
              </SheetContent>
            </Sheet>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={submitAttempt.isPending}
            onClick={() => {
              void handleSubmit(false)
            }}
          >
            {submitAttempt.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </header>

      <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-border hidden w-64 shrink-0 overflow-y-auto border-r p-4 sm:block">
          {palette}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-h3">
                Question {currentIndex + 1} of {questions.length}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  handleAnswerChange(current.questionId, {
                    flaggedForReview: !current.flaggedForReview,
                  })
                }}
              >
                <Flag
                  className={
                    current.flaggedForReview ? 'fill-warning text-warning size-4' : 'size-4'
                  }
                />
                {current.flaggedForReview ? 'Flagged' : 'Flag for review'}
              </Button>
            </div>
            <p className="text-body whitespace-pre-wrap">{current.questionText}</p>
            <span className="text-caption text-muted-foreground">{current.marks} marks</span>
            <QuestionRenderer
              question={current}
              onAnswerChange={(patch) => {
                handleAnswerChange(current.questionId, patch)
              }}
            />
          </div>
        </main>
      </div>

      <footer className="border-border bg-surface sticky bottom-0 flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={currentIndex === 0}
          onClick={() => {
            goTo(currentIndex - 1)
          }}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          type="button"
          className="gap-1.5"
          disabled={currentIndex === questions.length - 1}
          onClick={() => {
            goTo(currentIndex + 1)
          }}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </footer>
    </div>
  )
}
