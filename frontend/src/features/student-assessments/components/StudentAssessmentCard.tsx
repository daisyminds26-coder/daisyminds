import { useNavigate } from 'react-router-dom'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import { PassStatusBadge } from '@/features/assessments/components/AttemptStatusBadge'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useStartAttempt } from '@/features/student-assessments/hooks/use-attempt'
import type { StudentAssessment } from '@/features/student-assessments/types'

function cardState(assessment: StudentAssessment): { label: string; tone: StatusTone } {
  if (assessment.currentAttemptId) return { label: 'In progress', tone: 'info' }
  if (assessment.latestAttempt?.resultVisible) return { label: 'Result available', tone: 'success' }
  if (assessment.latestAttempt) return { label: 'Awaiting result', tone: 'warning' }
  if (assessment.canStart) return { label: 'Available', tone: 'neutral' }
  return { label: 'Not available', tone: 'neutral' }
}

export function StudentAssessmentCard({ assessment }: { assessment: StudentAssessment }) {
  const navigate = useNavigate()
  const startAttempt = useStartAttempt()
  const state = cardState(assessment)

  function goToAttempt(attemptId: string) {
    void navigate(`/student/assessments/${assessment.id}/attempt/${attemptId}`)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm font-medium">{assessment.title}</p>
            <p className="text-caption text-muted-foreground">
              {assessment.assessmentType === 'QUIZ' ? 'Quiz' : 'Examination'} ·{' '}
              {assessment.courseTitle} · {assessment.batchName}
            </p>
          </div>
          <StatusBadge label={state.label} tone={state.tone} />
        </div>

        <p className="text-body-sm text-muted-foreground">
          {assessment.durationMinutes} min · {assessment.attemptsUsed}/{assessment.maxAttempts}{' '}
          attempts used
        </p>

        {assessment.latestAttempt?.resultVisible &&
          assessment.latestAttempt.percentage !== null && (
            <p className="text-body-sm font-medium">
              {assessment.latestAttempt.percentage}%
              {assessment.latestAttempt.passStatus && (
                <span className="ml-2 inline-flex">
                  <PassStatusBadge status={assessment.latestAttempt.passStatus} />
                </span>
              )}
            </p>
          )}

        {assessment.currentAttemptId ? (
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => {
              goToAttempt(assessment.currentAttemptId ?? '')
            }}
          >
            Resume
          </Button>
        ) : assessment.latestAttempt ? (
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => {
              goToAttempt(assessment.latestAttempt?.id ?? '')
            }}
          >
            {assessment.latestAttempt.resultVisible ? 'View result' : 'View status'}
          </Button>
        ) : assessment.canStart ? (
          <Button
            size="sm"
            className="w-fit"
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
            {startAttempt.isPending ? 'Starting…' : 'Start'}
          </Button>
        ) : (
          <p className="text-caption text-muted-foreground">Not currently available.</p>
        )}
      </CardContent>
    </Card>
  )
}
