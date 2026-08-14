import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { PassStatusBadge } from '@/features/assessments/components/AttemptStatusBadge'
import { useMyAssessment } from '@/features/student-assessments/hooks/use-my-assessments'
import { useStartAttempt } from '@/features/student-assessments/hooks/use-attempt'

export default function StudentAssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const navigate = useNavigate()
  const assessmentQuery = useMyAssessment(assessmentId)
  const startAttempt = useStartAttempt()

  if (assessmentQuery.isLoading) return <PageLoader />
  if (assessmentQuery.isError || !assessmentQuery.data) {
    return (
      <PageContainer title="Assessment">
        <ErrorState
          description={
            assessmentQuery.isError
              ? getSafeErrorMessage(assessmentQuery.error)
              : 'Assessment not found.'
          }
          onRetry={() => void assessmentQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const assessment = assessmentQuery.data

  function goToAttempt(attemptId: string) {
    void navigate(`/student/assessments/${assessment.id}/attempt/${attemptId}`)
  }

  return (
    <PageContainer
      title={assessment.title}
      description={`${assessment.assessmentType === 'QUIZ' ? 'Quiz' : 'Examination'} · ${assessment.courseTitle} · ${assessment.batchName}`}
      actions={
        <Link
          to="/student/assessments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to assessments
        </Link>
      }
    >
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          {assessment.description && (
            <div className="sm:col-span-2">
              <p className="text-caption text-muted-foreground">Description</p>
              <p className="text-body-sm whitespace-pre-wrap">{assessment.description}</p>
            </div>
          )}
          {assessment.instructions && (
            <div className="sm:col-span-2">
              <p className="text-caption text-muted-foreground">Instructions</p>
              <p className="text-body-sm whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          )}
          <div>
            <p className="text-caption text-muted-foreground">Duration</p>
            <p className="text-body-sm">{assessment.durationMinutes} minutes</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Attempts</p>
            <p className="text-body-sm">
              {assessment.attemptsUsed} of {assessment.maxAttempts} used
            </p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Total marks</p>
            <p className="text-body-sm">{assessment.totalMarks}</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Passing percentage</p>
            <p className="text-body-sm">{assessment.passingPercentage ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {assessment.currentAttemptId ? (
          <Button
            onClick={() => {
              goToAttempt(assessment.currentAttemptId ?? '')
            }}
          >
            Resume attempt
          </Button>
        ) : assessment.canStart ? (
          <Button
            disabled={startAttempt.isPending}
            onClick={() => {
              startAttempt.mutate(assessment.id, {
                onSuccess: (attempt) => {
                  goToAttempt(attempt.id)
                },
                onError: (error) =>
                  toast.error('Could not start attempt', getSafeErrorMessage(error)),
              })
            }}
          >
            {startAttempt.isPending ? 'Starting…' : 'Start attempt'}
          </Button>
        ) : null}
      </div>

      {assessment.pastAttempts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">Attempt history</h2>
          <div className="border-border divide-border divide-y rounded-lg border">
            {assessment.pastAttempts.map((attempt) => (
              <button
                key={attempt.id}
                type="button"
                className="hover:bg-muted/50 flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => {
                  goToAttempt(attempt.id)
                }}
              >
                <span className="text-body-sm">
                  Attempt {attempt.attemptNumber} ·{' '}
                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '—'}
                </span>
                <span className="flex items-center gap-2">
                  {attempt.resultVisible && attempt.percentage !== null && (
                    <span className="text-body-sm">{attempt.percentage}%</span>
                  )}
                  {attempt.resultVisible && attempt.passStatus && (
                    <PassStatusBadge status={attempt.passStatus} />
                  )}
                  {!attempt.resultVisible && (
                    <span className="text-caption text-muted-foreground">Awaiting result</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
