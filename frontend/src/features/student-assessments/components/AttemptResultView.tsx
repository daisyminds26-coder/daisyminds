import { Link } from 'react-router-dom'
import { CheckCircle2, Clock } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { PassStatusBadge } from '@/features/assessments/components/AttemptStatusBadge'
import { QuestionTypeBadge } from '@/features/question-bank/components/QuestionTypeBadge'
import type { StudentAttempt } from '@/features/student-assessments/types'
import type { AttemptQuestion } from '@/features/assessments/types'

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

export function AttemptResultView({ attempt }: { attempt: StudentAttempt }) {
  if (!attempt.resultVisible) {
    return (
      <PageContainer title={attempt.assessmentTitle} description="Attempt result">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="text-muted-foreground size-10" aria-hidden="true" />
            <div>
              <p className="text-h3">Submitted — awaiting result</p>
              <p className="text-body-sm text-muted-foreground mt-1">
                Your attempt was submitted on{' '}
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}. Your
                score will be available once grading and result publication are complete.
              </p>
            </div>
            <Link to="/student/assessments" className={cn(buttonVariants({ variant: 'outline' }))}>
              Back to assessments
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer title={attempt.assessmentTitle} description="Attempt result">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="text-success size-10" aria-hidden="true" />
          <p className="text-display font-bold">
            {attempt.totalMarksAwarded} / {attempt.totalMarks}
          </p>
          <p className="text-body-sm text-muted-foreground">{attempt.percentage}%</p>
          {attempt.passStatus && <PassStatusBadge status={attempt.passStatus} />}
          <p className="text-caption text-muted-foreground">
            Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'} ·
            Attempt {attempt.attemptNumber}
          </p>
        </CardContent>
      </Card>

      {attempt.allowReview ? (
        <div className="flex flex-col gap-3">
          {attempt.questions.map((question, index) => (
            <Card key={question.questionId}>
              <CardContent className="flex flex-col gap-2 pt-6">
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
                  {question.marksAwarded !== null && question.marksAwarded !== undefined && (
                    <span className="text-caption text-muted-foreground">
                      {question.marksAwarded} marks awarded
                    </span>
                  )}
                </div>
                <p className="text-body-sm whitespace-pre-wrap">{question.questionText}</p>
                <div className="text-body-sm">
                  <span className="text-muted-foreground">Your answer: </span>
                  {studentAnswerSummary(question)}
                </div>
                {question.explanation && (
                  <div className="text-body-sm">
                    <span className="text-muted-foreground">Explanation: </span>
                    {question.explanation}
                  </div>
                )}
                {question.manualFeedback && (
                  <div className="text-body-sm">
                    <span className="text-muted-foreground">Trainer feedback: </span>
                    {question.manualFeedback}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Answer review is not available for this assessment — only your summary score is shown.
        </p>
      )}
    </PageContainer>
  )
}
